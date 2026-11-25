import "server-only";

import { and, between, eq, gt, inArray, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import {
  analiseGerencial,
  departamentos,
  grupos,
  previsaoDepartamento,
  previsaoDia,
  previsaoGrupo,
  previsaoSubgrupo,
  subgrupos,
} from "@/db/schema";
import { mesesDoPeriodo } from "@/lib/date";
import type { Origem } from "@/lib/filtros";
import { metaDiariaDoNivel, metaNivelNoPeriodo, type MetaMensal } from "../metas";
import type {
  LinhaMetaNivel,
  MetaDia,
  Nivel,
  NiveisMetasResponse,
  OpcoesMetasResponse,
  Periodo,
  RealizadoDia,
  TotalResponse,
} from "../types";

// Dados D-1 (carga noturna): cache de horas, invalidável pela tag.
const CACHE_TAG = "metas";

function vendaPorOrigem(origem: Origem) {
  if (origem === "pdv") return analiseGerencial.totalPDV;
  if (origem === "faturamento") return analiseGerencial.totalFaturamento;
  return analiseGerencial.totalVenda;
}

function custoPorOrigem(origem: Origem) {
  if (origem === "pdv") return analiseGerencial.totalCustoPDV;
  if (origem === "faturamento") return analiseGerencial.totalCustoFaturamento;
  return analiseGerencial.totalCusto;
}

const sum = (column: AnyColumn | SQL) => sql<number>`coalesce(sum(${column}), 0)`.mapWith(Number);
const pad = (numero: number) => String(numero).padStart(2, "0");

function filtroAnalise(periodo: Periodo, lojas: number[], departamento: number | null) {
  return and(
    inArray(analiseGerencial.filial, lojas),
    between(analiseGerencial.data, periodo.inicio, periodo.fim),
    departamento == null ? undefined : eq(analiseGerencial.departamento, departamento),
  );
}

const anos = (periodo: Periodo) => [Number(periodo.inicio.slice(0, 4)), Number(periodo.fim.slice(0, 4))] as const;

/** Meta diária da loja (soma das filiais), de `previsao_dia`. */
async function curvaDaLoja(periodo: Periodo, lojas: number[]): Promise<MetaDia[]> {
  const [anoInicio, anoFim] = anos(periodo);
  const linhas = await db
    .select({
      ano: previsaoDia.ano,
      mes: previsaoDia.mes,
      dia: previsaoDia.codigoDia,
      meta: sum(previsaoDia.previsaoVenda),
      metaLucro: sum(previsaoDia.previsaoLucro),
    })
    .from(previsaoDia)
    .where(and(inArray(previsaoDia.codigoFilial, lojas), between(previsaoDia.ano, anoInicio, anoFim)))
    .groupBy(previsaoDia.ano, previsaoDia.mes, previsaoDia.codigoDia);
  return linhas
    .map((linha) => ({ data: `${linha.ano}-${pad(linha.mes!)}-${pad(linha.dia!)}`, meta: linha.meta, metaLucro: linha.metaLucro }))
    .filter((dia) => dia.data >= periodo.inicio && dia.data <= periodo.fim);
}

/** Metas mensais de um nível (soma das filiais) nos meses do período. */
async function metasMensais(nivel: Nivel, periodo: Periodo, lojas: number[]): Promise<MetaMensal[]> {
  const tabela = { departamento: previsaoDepartamento, grupo: previsaoGrupo, subgrupo: previsaoSubgrupo }[nivel];
  const [anoInicio, anoFim] = anos(periodo);
  const meses = new Set(mesesDoPeriodo(periodo));
  const linhas = await db
    .select({
      codigo: tabela.codigo,
      ano: tabela.ano,
      mes: tabela.mes,
      meta: sum(tabela.previsaoVenda),
      metaLucro: sum(tabela.previsaoLucro),
    })
    .from(tabela)
    .where(and(inArray(tabela.codigoFilial, lojas), between(tabela.ano, anoInicio, anoFim)))
    .groupBy(tabela.codigo, tabela.ano, tabela.mes);
  return linhas
    .map((linha) => ({ codigo: linha.codigo!, mes: `${linha.ano}-${pad(linha.mes!)}`, meta: linha.meta, metaLucro: linha.metaLucro }))
    .filter((linha) => meses.has(linha.mes));
}

/** Meses com meta cadastrada e lista de departamentos para o filtro. */
export async function getOpcoes(lojas: number[]): Promise<OpcoesMetasResponse> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const [meses, deps] = await Promise.all([
    db
      .selectDistinct({ ano: previsaoDia.ano, mes: previsaoDia.mes })
      .from(previsaoDia)
      .where(and(inArray(previsaoDia.codigoFilial, lojas), gt(previsaoDia.previsaoVenda, 0))),
    db
      .select({ codigo: departamentos.codigo, descricao: sql<string>`trim(${departamentos.descricao})` })
      .from(departamentos)
      .orderBy(departamentos.descricao),
  ]);
  return {
    mesesComMeta: meses.map((mes) => `${mes.ano}-${pad(mes.mes!)}`).sort(),
    departamentos: deps,
  };
}

/**
 * Meta diária do período: da loja (`previsao_dia`) ou, com o filtro Departamento,
 * a meta mensal do departamento dividida igualmente pelos dias (P33).
 */
export async function getMetasDiarias(
  periodo: Periodo,
  lojas: number[],
  departamento: number | null,
): Promise<MetaDia[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  if (departamento == null) return curvaDaLoja(periodo, lojas);
  // Departamento: só há meta mensal, dividida igualmente pelos dias (P33).
  const mensais = (await metasMensais("departamento", periodo, lojas)).filter((metaMensal) => metaMensal.codigo === departamento);
  return metaDiariaDoNivel(mensais).filter((dia) => dia.data >= periodo.inicio && dia.data <= periodo.fim);
}

/** Venda e custo por dia (só os dias com carga). */
export async function getRealizadoDiario(
  periodo: Periodo,
  lojas: number[],
  origem: Origem,
  departamento: number | null,
): Promise<RealizadoDia[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  return db
    .select({
      data: analiseGerencial.data,
      venda: sum(vendaPorOrigem(origem)),
      custo: sum(custoPorOrigem(origem)),
    })
    .from(analiseGerencial)
    .where(filtroAnalise(periodo, lojas, departamento))
    .groupBy(analiseGerencial.data);
}

/** Venda e custo somados no período (aba Ano: o ano até a referência, sem trazer cada dia). */
export async function getTotal(
  periodo: Periodo,
  lojas: number[],
  origem: Origem,
  departamento: number | null,
): Promise<TotalResponse> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const [total] = await db
    .select({ venda: sum(vendaPorOrigem(origem)), custo: sum(custoPorOrigem(origem)) })
    .from(analiseGerencial)
    .where(filtroAnalise(periodo, lojas, departamento));
  return total ?? { venda: 0, custo: 0 };
}

const colunasNivel = {
  departamento: { coluna: analiseGerencial.departamento, pai: null },
  grupo: { coluna: analiseGerencial.grupo, pai: analiseGerencial.departamento },
  subgrupo: { coluna: analiseGerencial.subgrupo, pai: analiseGerencial.grupo },
} as const;

async function realizadoPorNivel(
  nivel: Nivel,
  periodo: Periodo | null,
  lojas: number[],
  origem: Origem,
  departamento: number | null,
) {
  if (!periodo) return [];
  const { coluna, pai } = colunasNivel[nivel];
  return db
    .select({
      codigo: coluna,
      // Códigos são únicos em toda a hierarquia: o pai é o mesmo em todas as linhas.
      pai: pai ? sql<number>`max(${pai})`.mapWith(Number) : sql<null>`null`,
      venda: sum(vendaPorOrigem(origem)),
      custo: sum(custoPorOrigem(origem)),
    })
    .from(analiseGerencial)
    .where(filtroAnalise(periodo, lojas, departamento))
    .groupBy(coluna);
}

/** Código, descrição, pai e departamento de cada item do nível (para metas sem venda e para o filtro). */
async function hierarquia(nivel: Nivel) {
  if (nivel === "departamento") {
    const linhas = await db
      .select({ codigo: departamentos.codigo, descricao: sql<string>`trim(${departamentos.descricao})` })
      .from(departamentos);
    return linhas.map((linha) => ({ ...linha, pai: null as number | null, departamento: linha.codigo }));
  }
  if (nivel === "grupo") {
    const linhas = await db
      .select({ codigo: grupos.codigo, descricao: sql<string>`trim(${grupos.descricao})`, pai: grupos.departamento })
      .from(grupos);
    return linhas.map((linha) => ({ ...linha, departamento: linha.pai }));
  }
  const linhas = await db
    .select({
      codigo: subgrupos.codigo,
      descricao: sql<string>`trim(${subgrupos.descricao})`,
      pai: subgrupos.grupo,
      departamento: grupos.departamento,
    })
    .from(subgrupos)
    .leftJoin(grupos, eq(grupos.codigo, subgrupos.grupo));
  return linhas.map((linha) => ({ ...linha, departamento: linha.departamento ?? -1 }));
}

/**
 * Meta (do período inteiro e esperada até a referência), realizado e venda da
 * comparação por departamento, grupo ou subgrupo.
 */
export async function getNiveisMetas(
  nivel: Nivel,
  periodo: Periodo,
  decorrido: Periodo | null,
  comparacao: Periodo | null,
  lojas: number[],
  origem: Origem,
  departamento: number | null,
): Promise<NiveisMetasResponse> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const [atual, anterior, mensais, itens] = await Promise.all([
    realizadoPorNivel(nivel, decorrido, lojas, origem, departamento),
    realizadoPorNivel(nivel, comparacao, lojas, origem, departamento),
    metasMensais(nivel, periodo, lojas),
    hierarquia(nivel),
  ]);

  const porCodigo = new Map(itens.map((item) => [item.codigo, item]));
  const noFiltro = (codigo: number) => departamento == null || porCodigo.get(codigo)?.departamento === departamento;
  const mensaisPorCodigo = Map.groupBy(mensais, (metaMensal) => metaMensal.codigo);
  const atualPorCodigo = new Map(atual.map((registro) => [registro.codigo, registro]));
  const anteriorPorCodigo = new Map(anterior.map((registro) => [registro.codigo, registro.venda]));
  const codigos = new Set([...atual.map((registro) => registro.codigo), ...mensaisPorCodigo.keys()].filter(noFiltro));

  const linhas: LinhaMetaNivel[] = [...codigos].map((codigo) => {
    const metasDoCodigo = mensaisPorCodigo.get(codigo) ?? [];
    const total = metaNivelNoPeriodo(metasDoCodigo, periodo);
    const esperada = metaNivelNoPeriodo(metasDoCodigo, decorrido);
    const real = atualPorCodigo.get(codigo);
    return {
      codigo,
      descricao: porCodigo.get(codigo)?.descricao ?? `Código ${codigo} (sem cadastro)`,
      pai: real?.pai ?? porCodigo.get(codigo)?.pai ?? null,
      meta: total?.meta ?? null,
      // Período ainda não começou: nada era esperado até a referência.
      metaEsperada: decorrido ? (esperada?.meta ?? null) : total ? 0 : null,
      metaLucro: total?.metaLucro ?? null,
      venda: real?.venda ?? 0,
      custo: real?.custo ?? 0,
      vendaAnterior: anteriorPorCodigo.get(codigo) ?? 0,
    };
  });

  return {
    nivel,
    linhas: linhas
      .filter((linhaMetaNivel) => linhaMetaNivel.venda || linhaMetaNivel.vendaAnterior || linhaMetaNivel.meta)
      .sort((registro, segundo) => (segundo.meta ?? 0) - (registro.meta ?? 0) || segundo.venda - registro.venda),
  };
}
