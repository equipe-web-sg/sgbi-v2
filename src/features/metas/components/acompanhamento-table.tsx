"use client";

import { SituacaoPontos } from "@/components/situacao-pontos";
import Icon from "@mdi/react";
import { mdiDownload, mdiMagnify, mdiTarget } from "@mdi/js";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { Delta } from "@/components/kpi/kpi-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Segmented } from "@/components/ui/segmented";
import { VerTodos } from "@/components/ui/ver-todos";
import { variacao } from "@/lib/calc";
import { baixarCsv } from "@/lib/csv";
import { formatMoeda, formatPercentual } from "@/lib/format";
import { resumirMeta, type ResumoMeta } from "../compute";
import { metasQueries } from "../queries";
import { explicarStatusMargem, explicarStatusMeta } from "../textos";
import type { FiltrosMetas, LinhaMetaNivel, Nivel, PeriodoMeta } from "../types";
import { DO_PERIODO } from "./kpis-metas";
import { ORDEM_MARGEM, ORDEM_STATUS, PONTOS_MARGEM, ROTULO_STATUS, StatusMargemBadge, StatusMetaBadge } from "./status";

const ORDEM: Nivel[] = ["departamento", "grupo", "subgrupo"];

const NIVEIS: { value: Nivel; label: string }[] = [
  { value: "departamento", label: "Departamento" },
  { value: "grupo", label: "Grupo" },
  { value: "subgrupo", label: "Subgrupo" },
];

export type LinhaAcompanhamento = {
  codigo: number;
  descricao: string;
  pai: number | null;
  resumo: ResumoMeta;
  variacaoVenda: number | null;
};

/** Linha da tabela a partir da meta e do realizado do nível. */
export function calcularLinha(linhaMetaNivel: LinhaMetaNivel, aba: PeriodoMeta): LinhaAcompanhamento {
  return {
    codigo: linhaMetaNivel.codigo,
    descricao: linhaMetaNivel.descricao,
    pai: linhaMetaNivel.pai,
    resumo: resumirMeta({
      meta: linhaMetaNivel.meta != null ? { meta: linhaMetaNivel.meta, metaLucro: linhaMetaNivel.metaLucro ?? 0 } : null,
      metaEsperada: linhaMetaNivel.metaEsperada,
      venda: linhaMetaNivel.venda,
      custo: linhaMetaNivel.custo,
      periodo: aba.periodo,
      decorrido: aba.decorrido,
    }),
    variacaoVenda: aba.decorrido ? variacao(linhaMetaNivel.venda, linhaMetaNivel.vendaAnterior) : null,
  };
}

const carregando = (consulta: { isPending: boolean; isPlaceholderData: boolean }) => consulta.isPending || consulta.isPlaceholderData;
const SEM_VALOR = <span className="text-muted-foreground">—</span>;

/** Moeda colorida pelo sinal (diferença para a meta). */
function Sinal({ value, children }: { value: number | null; children: React.ReactNode }) {
  if (value == null) return SEM_VALOR;
  return <span className={value >= 0 ? "text-success" : "text-error"}>{children}</span>;
}

const pctDiferenca = (resumoMeta: ResumoMeta) => (resumoMeta.meta && resumoMeta.diferenca != null ? (resumoMeta.diferenca / resumoMeta.meta) * 100 : null);

function colunasAcompanhamento(rotuloNivel: string, metaDoPeriodo: string): Coluna<LinhaAcompanhamento>[] {
  return [
    { id: "nome", titulo: rotuloNivel, subtitulo: "Nome", align: "left", cell: (linhaAcompanhamento) => linhaAcompanhamento.descricao, ordenar: (linhaAcompanhamento) => linhaAcompanhamento.descricao },
    {
      id: "meta",
      titulo: `Meta ${metaDoPeriodo}`,
      subtitulo: "Valor",
      divisor: true,
      cell: (linhaAcompanhamento) => (linhaAcompanhamento.resumo.meta != null ? formatMoeda(linhaAcompanhamento.resumo.meta) : SEM_VALOR),
      ordenar: (linhaAcompanhamento) => linhaAcompanhamento.resumo.meta,
    },
    { id: "realizado", titulo: "Realizado", subtitulo: "Valor", divisor: true, cell: (linhaAcompanhamento) => formatMoeda(linhaAcompanhamento.resumo.realizado), ordenar: (linhaAcompanhamento) => linhaAcompanhamento.resumo.realizado },
    {
      id: "var-realizado",
      titulo: "Realizado",
      subtitulo: "Var. %",
      cell: (linhaAcompanhamento) => <Delta value={linhaAcompanhamento.variacaoVenda} unidade="%" maiorMelhor />,
      ordenar: (linhaAcompanhamento) => linhaAcompanhamento.variacaoVenda,
    },
    {
      id: "atingimento",
      titulo: "Atingimento",
      subtitulo: "%",
      divisor: true,
      cell: (linhaAcompanhamento) => <span className="font-semibold">{formatPercentual(linhaAcompanhamento.resumo.atingimento)}</span>,
      ordenar: (linhaAcompanhamento) => linhaAcompanhamento.resumo.atingimento,
    },
    {
      id: "status",
      titulo: "Atingimento",
      subtitulo: "Situação",
      align: "left",
      cell: (linhaAcompanhamento) => <StatusMetaBadge status={linhaAcompanhamento.resumo.status} explicacao={explicarStatusMeta(linhaAcompanhamento.resumo)} />,
      ordenar: (linhaAcompanhamento) => ORDEM_STATUS[linhaAcompanhamento.resumo.status],
    },
    {
      id: "diferenca",
      titulo: "Diferença",
      subtitulo: "Valor",
      divisor: true,
      cell: (linhaAcompanhamento) => <Sinal value={linhaAcompanhamento.resumo.diferenca}>{formatMoeda(linhaAcompanhamento.resumo.diferenca)}</Sinal>,
      ordenar: (linhaAcompanhamento) => linhaAcompanhamento.resumo.diferenca,
    },
    {
      id: "diferenca-pct",
      titulo: "Diferença",
      subtitulo: "%",
      cell: (linhaAcompanhamento) => <Sinal value={linhaAcompanhamento.resumo.diferenca}>{formatPercentual(pctDiferenca(linhaAcompanhamento.resumo))}</Sinal>,
      ordenar: (linhaAcompanhamento) => pctDiferenca(linhaAcompanhamento.resumo),
    },
    { id: "projecao", titulo: "Projeção de Fechamento", subtitulo: "Valor", divisor: true, cell: (linhaAcompanhamento) => formatMoeda(linhaAcompanhamento.resumo.projecao), ordenar: (linhaAcompanhamento) => linhaAcompanhamento.resumo.projecao },
    {
      id: "projecao-meta",
      titulo: "Projeção de Fechamento",
      subtitulo: "% meta",
      cell: (linhaAcompanhamento) =>
        linhaAcompanhamento.resumo.projecaoSobreMeta == null ? (
          SEM_VALOR
        ) : (
          <Sinal value={linhaAcompanhamento.resumo.projecaoSobreMeta - 100}>{formatPercentual(linhaAcompanhamento.resumo.projecaoSobreMeta)}</Sinal>
        ),
      ordenar: (linhaAcompanhamento) => linhaAcompanhamento.resumo.projecaoSobreMeta,
    },
    { id: "meta-margem", titulo: "Meta de Margem", subtitulo: "%", divisor: true, cell: (linhaAcompanhamento) => formatPercentual(linhaAcompanhamento.resumo.metaMargem), ordenar: (linhaAcompanhamento) => linhaAcompanhamento.resumo.metaMargem },
    { id: "margem", titulo: "Margem Atual", subtitulo: "%", divisor: true, cell: (linhaAcompanhamento) => formatPercentual(linhaAcompanhamento.resumo.margem), ordenar: (linhaAcompanhamento) => linhaAcompanhamento.resumo.margem },
    {
      id: "status-margem",
      titulo: "Situação Margem",
      subtitulo: <SituacaoPontos itens={PONTOS_MARGEM} />,
      rotulo: "Situação da margem",
      align: "left",
      divisor: true,
      cell: (linhaAcompanhamento) => <StatusMargemBadge status={linhaAcompanhamento.resumo.statusMargem} explicacao={explicarStatusMargem(linhaAcompanhamento.resumo)} />,
      ordenar: (linhaAcompanhamento) => ORDEM_MARGEM[linhaAcompanhamento.resumo.statusMargem],
    },
  ];
}

/**
 * Meta, realizado, atingimento, diferença, projeção e margem por nível
 * mercadológico, na aba de período escolhida. Cada linha expande no nível de baixo.
 */
export function AcompanhamentoTable({
  filtros,
  aba,
  total,
}: {
  filtros: FiltrosMetas;
  aba: PeriodoMeta;
  /** Total da loja (ou do departamento filtrado), da mesma fonte dos KPIs. */
  total: LinhaAcompanhamento;
}) {
  const [nivel, setNivel] = useState<Nivel>("departamento");
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const buscaAdiada = useDeferredValue(busca);

  // Níveis a partir da aba escolhida; os de baixo só carregam ao expandir uma linha.
  const niveis = ORDEM.slice(ORDEM.indexOf(nivel));
  const abertosNoNivel = (nivelAlvo: Nivel) => [...abertos].some((chave) => chave.startsWith(`${nivelAlvo}:`));
  const habilitado = (indice: number) => indice === 0 || (!!niveis[indice] && abertosNoNivel(niveis[indice - 1]));
  const opcoes = (indice: number) => {
    const consulta = metasQueries.niveis(filtros, niveis[indice] ?? nivel, aba);
    return { ...consulta, enabled: consulta.enabled !== false && habilitado(indice) };
  };
  // Número fixo de hooks: uma consulta por nível possível.
  const consultas = [useQuery(opcoes(0)), useQuery(opcoes(1)), useQuery(opcoes(2))];
  const base = consultas[0];

  const linhasPorNivel = niveis.map((_, indice) => (consultas[indice].data?.linhas ?? []).map((linhaMetaNivel) => calcularLinha(linhaMetaNivel, aba)));
  const termo = buscaAdiada.trim().toLocaleLowerCase("pt-BR");
  const raiz = linhasPorNivel[0].filter((linhaAcompanhamento) => !termo || linhaAcompanhamento.descricao.toLocaleLowerCase("pt-BR").includes(termo));

  const alternar = (chave: string) =>
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(chave)) proximo.delete(chave);
      else proximo.add(chave);
      return proximo;
    });

  const rotuloNivel = NIVEIS.find((opcao) => opcao.value === nivel)!.label;

  const exportar = () => {
    const csv: (string | number | null)[][] = [];
    const adicionar = (profundidade: number, lista: LinhaAcompanhamento[]) => {
      for (const linhaAcompanhamento of lista) {
        const resumoMeta = linhaAcompanhamento.resumo;
        csv.push([
          NIVEIS.find((opcao) => opcao.value === niveis[profundidade])!.label,
          linhaAcompanhamento.descricao,
          resumoMeta.meta,
          resumoMeta.realizado,
          linhaAcompanhamento.variacaoVenda,
          resumoMeta.atingimento,
          ROTULO_STATUS[resumoMeta.status],
          resumoMeta.diferenca,
          resumoMeta.projecao,
          resumoMeta.projecaoSobreMeta,
          resumoMeta.metaMargem,
          resumoMeta.margem,
        ]);
        if (abertos.has(`${niveis[profundidade]}:${linhaAcompanhamento.codigo}`) && linhasPorNivel[profundidade + 1]) {
          adicionar(profundidade + 1, linhasPorNivel[profundidade + 1].filter((filha) => filha.pai === linhaAcompanhamento.codigo));
        }
      }
    };
    adicionar(0, raiz);
    adicionar(0, [total]);
    baixarCsv(
      `metas-${aba.id}-${nivel}-${aba.periodo.inicio}-a-${aba.periodo.fim}.csv`,
      ["Nível", "Descrição", "Meta (R$)", "Realizado (R$)", "Var. realizado (%)", "Atingimento (%)", "Situação",
        "Diferença (R$)", "Projeção (R$)", "Projeção / meta (%)", "Meta de margem (%)", "Margem atual (%)"],
      csv,
    );
  };

  // Os controles da tabela são os mesmos no card e na janela "Ver todos" (o estado é do card).
  const controles = (
    <>
      <Segmented
        label="Nível"
        value={nivel}
        options={NIVEIS}
        onChange={(novoNivel) => {
          setNivel(novoNivel);
          setAbertos(new Set());
        }}
      />
      <label className="relative">
        <span className="sr-only">Buscar {rotuloNivel.toLowerCase()}</span>
        <Icon
          path={mdiMagnify}
          size={0.75}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder={`Buscar ${rotuloNivel.toLowerCase()}…`}
          className="h-9 w-48 rounded-lg border bg-card pl-8 pr-3 text-sm shadow-xs outline-none focus-visible:border-primary"
        />
      </label>
      <button
        type="button"
        onClick={exportar}
        disabled={!base.data}
        className="flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium shadow-xs transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
      >
        <Icon path={mdiDownload} size={0.75} aria-hidden />
        Exportar
      </button>
    </>
  );
  const tabela = (
    <DataTable
      colunas={colunasAcompanhamento(rotuloNivel, DO_PERIODO[aba.id])}
      linhas={raiz}
      chave={(linhaAcompanhamento, profundidade) => `${niveis[profundidade]}:${linhaAcompanhamento.codigo}`}
      total={total}
      rotuloTotal="Total"
      arvore={{
        abertas: abertos,
        alternar,
        expansivel: (profundidade) => profundidade < niveis.length - 1,
        filhos: (linhaAcompanhamento, profundidade) => ({
          linhas: linhasPorNivel[profundidade + 1].filter((filha) => filha.pai === linhaAcompanhamento.codigo),
          carregando: carregando(consultas[profundidade + 1]),
        }),
        rotuloVazio: "Sem meta nem venda no nível de baixo.",
        descricao: (linhaAcompanhamento) => linhaAcompanhamento.descricao,
      }}
    />
  );
  const titulo = `Acompanhamento das Metas por ${rotuloNivel} · ${aba.label}`;

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon path={mdiTarget} size={0.9} className="text-primary" aria-hidden />
          {titulo}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {controles}
          <VerTodos
            titulo={titulo}
            descricao="Meta, realizado, atingimento, projeção e margem de cada item. Use a seta da linha para abrir o nível de baixo."
            filtros={controles}
            desabilitado={!base.data}
            carregando={carregando(base)}
          >
            {tabela}
          </VerTodos>
        </div>
      </CardHeader>

      <div className="relative flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2" aria-busy={carregando(base)}>
        {base.isPending ? (
          <div className="min-h-0 flex-1 rounded-xl border" />
        ) : base.isError ? (
          <p className="py-10 text-center text-sm text-error">{base.error.message}</p>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border">{tabela}</div>
        )}
        {/* z-20: acima do cabeçalho fixo (sticky) da tabela. */}
        <LoadingOverlay ativo={carregando(base)} className="z-20 rounded-b-2xl" />
      </div>
    </Card>
  );
}
