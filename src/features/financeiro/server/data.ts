import "server-only";

import { and, between, eq, gt, inArray, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { cartoesEmpresas, cartoesVendas, contasPagar, contasReceber, fornecedores } from "@/db/schema";
import { addDays } from "@/lib/date";
import type { Compromisso, Movimento, Periodo, PrazosResponse, SituacaoMovimento } from "../types";

// Dados D-1 (carga noturna): cache de horas, invalidável pela tag.
const CACHE_TAG = "financeiro";

const sum = (column: AnyColumn | SQL) => sql<number>`coalesce(sum(${column}), 0)`.mapWith(Number);
/** Datas vazias do VX chegam como 0000-00-00. */
const preenchida = (column: AnyColumn) => gt(column, "1900-01-01");

/** Valor de um título pago (o total pago; sem ele, o valor do título + taxa do boleto). */
const valorPago = sql`coalesce(nullif(${contasPagar.valorTotalPagamento}, 0), ${contasPagar.valorPagar} + coalesce(${contasPagar.taxaBoleto}, 0))`;
const valorAPagar = sql`${contasPagar.valorPagar} + coalesce(${contasPagar.taxaBoleto}, 0)`;

/** Categoria de saída: "D" = despesa (P45); o resto, compra de mercadoria. */
const categoriaPagar = sql<string>`case when ${contasPagar.classificacaoProduto} = 'D' then 'Despesas' else 'Fornecedores (mercadoria)' end`;
const CATEGORIA_RECEBER = "Clientes (contas a receber)";

// Sem texto acentuado no SQL: a tabela é latin1 e o literal viria em utf8mb4 (mistura de collations).
const empresa = {
  descricao: sql<string | null>`trim(${cartoesEmpresas.descricaoEmpresa})`,
  codigo: cartoesVendas.codigoEmpresa,
};
const nomeEmpresa = (registroEmpresa: { descricao: string | null; codigo: number | null }) => registroEmpresa.descricao || `Cartão ${registroEmpresa.codigo}`;

function situacaoEmAberto(vencimento: string, referencia: string): SituacaoMovimento {
  return vencimento <= referencia ? "vencido" : "previsto";
}

/**
 * Movimentos de caixa por dia e categoria no intervalo:
 * - cartões: valor líquido no vencimento (liquidação); até a referência conta como realizado (P43);
 * - contas a receber e a pagar: realizadas na data do recebimento/pagamento (se até a referência),
 *   em aberto no vencimento.
 */
export async function getMovimentos(periodo: Periodo, referencia: string, lojas: number[]): Promise<Movimento[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const { inicio, fim } = periodo;
  const [cartoes, receber, pagar] = await Promise.all([
    db
      .select({ data: cartoesVendas.dataVencimento, ...empresa, valor: sum(cartoesVendas.valorLiquido) })
      .from(cartoesVendas)
      .leftJoin(cartoesEmpresas, eq(cartoesEmpresas.codigoEmpresa, cartoesVendas.codigoEmpresa))
      .where(and(inArray(cartoesVendas.codigoFilial, lojas), between(cartoesVendas.dataVencimento, inicio, fim)))
      .groupBy(cartoesVendas.dataVencimento, cartoesVendas.codigoEmpresa),
    // Tabelas pequenas: traz cada título e decide a situação pela referência.
    db
      .select({
        vencimento: contasReceber.dataVencimento,
        recebimento: contasReceber.dataRecebimento,
        valorDocumento: contasReceber.valorDocumento,
        valorRecebido: contasReceber.valorRecebido,
      })
      .from(contasReceber)
      .where(
        and(
          inArray(contasReceber.codigoFilial, lojas),
          sql`(${contasReceber.dataVencimento} between ${inicio} and ${fim} or ${contasReceber.dataRecebimento} between ${inicio} and ${fim})`,
        ),
      ),
    db
      .select({
        vencimento: contasPagar.dataVencimento,
        pagamento: contasPagar.dataPagamento,
        categoria: categoriaPagar,
        pago: sql<number>`${valorPago}`.mapWith(Number),
        aPagar: sql<number>`${valorAPagar}`.mapWith(Number),
      })
      .from(contasPagar)
      .where(
        and(
          inArray(contasPagar.codigoFilial, lojas),
          sql`(${contasPagar.dataVencimento} between ${inicio} and ${fim} or ${contasPagar.dataPagamento} between ${inicio} and ${fim})`,
        ),
      ),
  ]);

  const movimentos: Movimento[] = [];
  const dentro = (data: string | null) => !!data && data > "1900-01-01" && data >= inicio && data <= fim;

  for (const cartao of cartoes) {
    if (!dentro(cartao.data)) continue;
    movimentos.push({
      data: cartao.data!,
      tipo: "entrada",
      fonte: "cartao",
      categoria: nomeEmpresa(cartao),
      situacao: cartao.data! <= referencia ? "realizado" : "previsto",
      valor: cartao.valor,
    });
  }

  for (const contaReceber of receber) {
    // Recebido até a referência: realizado no dia do recebimento; senão, em aberto no vencimento.
    const recebido = dentro(contaReceber.recebimento) && contaReceber.recebimento! <= referencia;
    if (recebido) {
      movimentos.push({
        data: contaReceber.recebimento!,
        tipo: "entrada",
        fonte: "receber",
        categoria: CATEGORIA_RECEBER,
        situacao: "realizado",
        valor: contaReceber.valorRecebido ?? 0,
      });
    } else if (dentro(contaReceber.vencimento)) {
      movimentos.push({
        data: contaReceber.vencimento!,
        tipo: "entrada",
        fonte: "receber",
        categoria: CATEGORIA_RECEBER,
        situacao: situacaoEmAberto(contaReceber.vencimento!, referencia),
        valor: contaReceber.valorDocumento ?? 0,
      });
    }
  }

  for (const contaPagar of pagar) {
    const pago = dentro(contaPagar.pagamento) && contaPagar.pagamento! <= referencia;
    if (pago) {
      movimentos.push({
        data: contaPagar.pagamento!,
        tipo: "saida",
        fonte: "pagar",
        categoria: contaPagar.categoria,
        situacao: "realizado",
        valor: contaPagar.pago,
      });
    } else if (dentro(contaPagar.vencimento)) {
      movimentos.push({
        data: contaPagar.vencimento!,
        tipo: "saida",
        fonte: "pagar",
        categoria: contaPagar.categoria,
        situacao: situacaoEmAberto(contaPagar.vencimento!, referencia),
        valor: contaPagar.aPagar,
      });
    }
  }

  return movimentos;
}

/**
 * Compromissos dos próximos dias e títulos vencidos em aberto (até 60 dias antes da referência).
 * Os cartões de um dia são agrupados por empresa (são milhares de parcelas).
 */
export async function getCompromissos(referencia: string, dias: number, lojas: number[]): Promise<Compromisso[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const ate = addDays(referencia, dias);
  const desde = addDays(referencia, -60);
  const [cartoes, receber, pagar] = await Promise.all([
    db
      .select({ data: cartoesVendas.dataVencimento, ...empresa, valor: sum(cartoesVendas.valorLiquido) })
      .from(cartoesVendas)
      .leftJoin(cartoesEmpresas, eq(cartoesEmpresas.codigoEmpresa, cartoesVendas.codigoEmpresa))
      .where(
        and(
          inArray(cartoesVendas.codigoFilial, lojas),
          between(cartoesVendas.dataVencimento, addDays(referencia, 1), ate),
        ),
      )
      .groupBy(cartoesVendas.dataVencimento, cartoesVendas.codigoEmpresa),
    db
      .select({
        data: contasReceber.dataVencimento,
        descricao: sql<string>`coalesce(nullif(trim(${contasReceber.nomeCliente}), ''), 'Cliente sem nome')`,
        valor: sql<number>`coalesce(${contasReceber.valorDocumento}, 0)`.mapWith(Number),
        recebimento: contasReceber.dataRecebimento,
      })
      .from(contasReceber)
      .where(and(inArray(contasReceber.codigoFilial, lojas), between(contasReceber.dataVencimento, desde, ate))),
    db
      .select({
        data: contasPagar.dataVencimento,
        descricao: sql<string>`coalesce(nullif(trim(${contasPagar.nome}), ''), nullif(trim(${fornecedores.nomeFantasia}), ''), nullif(trim(${fornecedores.razaoSocial}), ''), nullif(trim(${contasPagar.observacao}), ''), ${categoriaPagar})`,
        valor: sql<number>`${valorAPagar}`.mapWith(Number),
        pagamento: contasPagar.dataPagamento,
      })
      .from(contasPagar)
      .leftJoin(fornecedores, eq(fornecedores.codigo, contasPagar.codigoFornecedor))
      .where(and(inArray(contasPagar.codigoFilial, lojas), between(contasPagar.dataVencimento, desde, ate))),
  ]);

  // Em aberto na referência: sem baixa, ou baixado depois dela.
  const emAberto = (baixa: string | null) => !baixa || baixa <= "1900-01-01" || baixa > referencia;
  const lista: Compromisso[] = [
    ...cartoes.map((cartao) => ({
      data: cartao.data!,
      tipo: "entrada" as const,
      fonte: "cartao" as const,
      descricao: `Cartão · ${nomeEmpresa(cartao)}`,
      valor: cartao.valor,
      situacao: "previsto" as const,
    })),
    ...receber
      .filter((contaReceber) => emAberto(contaReceber.recebimento))
      .map((contaReceber) => ({
        data: contaReceber.data!,
        tipo: "entrada" as const,
        fonte: "receber" as const,
        descricao: contaReceber.descricao,
        valor: contaReceber.valor,
        situacao: situacaoEmAberto(contaReceber.data!, referencia) as "previsto" | "vencido",
      })),
    ...pagar
      .filter((contaPagar) => emAberto(contaPagar.pagamento))
      .map((contaPagar) => ({
        data: contaPagar.data!,
        tipo: "saida" as const,
        fonte: "pagar" as const,
        descricao: contaPagar.descricao,
        valor: contaPagar.valor,
        situacao: situacaoEmAberto(contaPagar.data!, referencia) as "previsto" | "vencido",
      })),
  ];
  return lista.filter((compromisso) => compromisso.valor).sort((primeiro, segundo) => primeiro.data.localeCompare(segundo.data) || segundo.valor - primeiro.valor);
}

/** Prazos médios (dias, ponderados pelo valor) dos títulos emitidos/vendidos no período. */
export async function getPrazos(periodo: Periodo, lojas: number[]): Promise<PrazosResponse> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAG);

  const media = (dias: SQL, valor: SQL | AnyColumn) =>
    sql<number | null>`sum(${dias} * ${valor}) / nullif(sum(${valor}), 0)`.mapWith((bruto) =>
      bruto == null ? null : Number(bruto),
    );

  const [[cartoes], [receber], [pagar]] = await Promise.all([
    db
      .select({
        dias: media(
          sql`datediff(${cartoesVendas.dataVencimento}, ${cartoesVendas.dataVenda})`,
          cartoesVendas.valorLiquido,
        ),
      })
      .from(cartoesVendas)
      .where(
        and(
          inArray(cartoesVendas.codigoFilial, lojas),
          between(cartoesVendas.dataVenda, periodo.inicio, periodo.fim),
          preenchida(cartoesVendas.dataVencimento),
        ),
      ),
    db
      .select({
        dias: media(
          sql`datediff(${contasReceber.dataVencimento}, ${contasReceber.dataEmissao})`,
          contasReceber.valorDocumento,
        ),
      })
      .from(contasReceber)
      .where(
        and(
          inArray(contasReceber.codigoFilial, lojas),
          between(contasReceber.dataEmissao, periodo.inicio, periodo.fim),
          preenchida(contasReceber.dataVencimento),
        ),
      ),
    db
      .select({
        dias: media(sql`datediff(${contasPagar.dataVencimento}, ${contasPagar.dataEmissao})`, contasPagar.valorPagar),
      })
      .from(contasPagar)
      .where(
        and(
          inArray(contasPagar.codigoFilial, lojas),
          between(contasPagar.dataEmissao, periodo.inicio, periodo.fim),
          preenchida(contasPagar.dataVencimento),
        ),
      ),
  ]);
  return {
    recebimentoCartoes: cartoes?.dias ?? null,
    recebimentoClientes: receber?.dias ?? null,
    pagamento: pagar?.dias ?? null,
  };
}
