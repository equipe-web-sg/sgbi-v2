"use client";

import Icon from "@mdi/react";
import { mdiArrowRight } from "@mdi/js";
import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { formatMoeda, formatPercentual, formatPontos } from "@/lib/format";
import type { ResumoMeta } from "../compute";
import { METAS_CONFIG } from "../config";
import type { AbaPeriodo, PeriodoMeta } from "../types";
import type { LinhaAcompanhamento } from "./acompanhamento-table";
import { ORDEM_STATUS, StatusMetaBadge } from "./status";

function CardLista({
  titulo,
  acao,
  carregando,
  children,
}: {
  titulo: string;
  acao?: ReactNode;
  carregando: boolean;
  children: ReactNode;
}) {
  return (
    <Card className="@container min-w-0">
      <CardHeader className="flex-nowrap!">
        <CardTitle className="min-w-0 truncate text-sm" title={titulo}>
          {titulo}
        </CardTitle>
        {acao}
      </CardHeader>
      <div className="relative min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-1.5" aria-busy={carregando}>
        <div className="overflow-hidden rounded-lg border">{children}</div>
        <LoadingOverlay ativo={carregando} label={titulo} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-xs text-muted-foreground">{children}</p>;
}

type LinhaPeriodo = { periodo: PeriodoMeta; resumo: ResumoMeta };

function colunasPeriodos(onSelecionar: (aba: AbaPeriodo) => void): Coluna<LinhaPeriodo>[] {
  return [
    {
      id: "periodo",
      titulo: "Período",
      align: "left",
      cell: ({ periodo }) => (
        <button
          type="button"
          className="text-left font-medium focus-visible:outline-2 focus-visible:outline-ring"
          onClick={(evento) => {
            evento.stopPropagation();
            onSelecionar(periodo.id);
          }}
        >
          {periodo.label}
        </button>
      ),
    },
    { id: "meta", titulo: "Meta", cell: ({ resumo }) => formatMoeda(resumo.meta), ordenar: ({ resumo }) => resumo.meta },
    {
      id: "realizado",
      titulo: "Realizado",
      cell: ({ periodo, resumo }) => (periodo.decorrido ? formatMoeda(resumo.realizado) : "—"),
      ordenar: ({ periodo, resumo }) => (periodo.decorrido ? resumo.realizado : null),
    },
    {
      id: "atingimento",
      titulo: "Ating.",
      cell: ({ resumo }) => <span className="font-semibold">{formatPercentual(resumo.atingimento)}</span>,
      ordenar: ({ resumo }) => resumo.atingimento,
    },
    {
      id: "status",
      // Card estreito: só os pontos coloridos (o nome fica no título de cada um).
      titulo: <span className="sr-only @[26rem]:not-sr-only">Situação</span>,
      rotulo: "Situação",
      align: "left",
      cell: ({ resumo }) => <StatusMetaBadge status={resumo.status} compacto />,
      ordenar: ({ resumo }) => ORDEM_STATUS[resumo.status],
    },
  ];
}

/** Meta, realizado e atingimento de cada aba; clicar numa linha abre a aba. */
export function MetasPorPeriodo({
  linhas,
  ativa,
  onSelecionar,
  carregando,
}: {
  linhas: LinhaPeriodo[];
  ativa: AbaPeriodo;
  onSelecionar: (aba: AbaPeriodo) => void;
  carregando: boolean;
}) {
  return (
    <CardLista titulo="Metas por Período (total)" carregando={carregando}>
      <DataTable
        colunas={colunasPeriodos(onSelecionar)}
        linhas={linhas}
        chave={(linhaPeriodo) => linhaPeriodo.periodo.id}
        aoClicar={(linhaPeriodo) => onSelecionar(linhaPeriodo.periodo.id)}
        classeLinha={(linhaPeriodo) => (linhaPeriodo.periodo.id === ativa ? "bg-primary/10" : "")}
        cabecalhoFixo={false}
        densidade="mini"
      />
    </CardLista>
  );
}

const COLUNAS_RANKING: Coluna<LinhaAcompanhamento>[] = [
  {
    id: "departamento",
    titulo: "Departamento",
    align: "left",
    className: "w-full max-w-0 truncate",
    cell: (linhaAcompanhamento) => <span title={linhaAcompanhamento.descricao}>{linhaAcompanhamento.descricao}</span>,
    ordenar: (linhaAcompanhamento) => linhaAcompanhamento.descricao,
  },
  {
    id: "atingimento",
    titulo: "Ating.",
    cell: (linhaAcompanhamento) => <span className="font-semibold">{formatPercentual(linhaAcompanhamento.resumo.atingimento)}</span>,
    ordenar: (linhaAcompanhamento) => linhaAcompanhamento.resumo.atingimento,
  },
  {
    id: "diferenca",
    titulo: "Diferença",
    cell: (linhaAcompanhamento) => (
      <span className={(linhaAcompanhamento.resumo.diferenca ?? 0) >= 0 ? "text-success" : "text-error"}>{formatMoeda(linhaAcompanhamento.resumo.diferenca)}</span>
    ),
    ordenar: (linhaAcompanhamento) => linhaAcompanhamento.resumo.diferenca,
  },
  { id: "projecao", titulo: "Projeção", cell: (linhaAcompanhamento) => formatMoeda(linhaAcompanhamento.resumo.projecao), ordenar: (linhaAcompanhamento) => linhaAcompanhamento.resumo.projecao },
];

function TabelaRanking({ linhas }: { linhas: LinhaAcompanhamento[] }) {
  return <DataTable colunas={COLUNAS_RANKING} linhas={linhas} chave={(linhaAcompanhamento) => String(linhaAcompanhamento.codigo)} densidade="mini" vazio={null} />;
}

/** Realizado ÷ meta esperada até a referência (critério de risco e de melhor desempenho). */
export const ritmo = (resumoMeta: ResumoMeta) => (resumoMeta.metaEsperada ? resumoMeta.realizado / resumoMeta.metaEsperada : null);

/** Departamentos em risco ou com melhor desempenho, pelo ritmo (P37). */
export function RankingDepartamentos({
  titulo,
  descricao,
  linhas,
  carregando,
}: {
  titulo: string;
  descricao: string;
  linhas: LinhaAcompanhamento[];
  carregando: boolean;
}) {
  const limite = METAS_CONFIG.linhasNoCard;
  return (
    <CardLista
      titulo={titulo}
      carregando={carregando}
      acao={
        <Dialog>
          <DialogTrigger
            disabled={linhas.length <= limite}
            className="flex shrink-0 items-center gap-1 rounded px-1 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring disabled:invisible"
          >
            Ver todos
            <Icon path={mdiArrowRight} size={0.55} aria-hidden />
          </DialogTrigger>
          <DialogContent titulo={titulo} descricao={descricao} className="max-w-2xl">
            <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
              <div className="overflow-hidden rounded-lg border">
                <TabelaRanking linhas={linhas} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {linhas.length ? <TabelaRanking linhas={linhas.slice(0, limite)} /> : <Vazio>Nenhum departamento.</Vazio>}
    </CardLista>
  );
}

const COLUNAS_MARGEM: Coluna<LinhaAcompanhamento>[] = [
  {
    id: "departamento",
    titulo: "Departamento",
    align: "left",
    className: "w-full max-w-0 truncate",
    cell: (linhaAcompanhamento) => <span title={linhaAcompanhamento.descricao}>{linhaAcompanhamento.descricao}</span>,
    ordenar: (linhaAcompanhamento) => linhaAcompanhamento.descricao,
  },
  { id: "meta", titulo: "Meta", cell: (linhaAcompanhamento) => formatPercentual(linhaAcompanhamento.resumo.metaMargem), ordenar: (linhaAcompanhamento) => linhaAcompanhamento.resumo.metaMargem },
  { id: "atual", titulo: "Atual", cell: (linhaAcompanhamento) => formatPercentual(linhaAcompanhamento.resumo.margem), ordenar: (linhaAcompanhamento) => linhaAcompanhamento.resumo.margem },
  {
    id: "diferenca",
    titulo: "Dif.",
    cell: (linhaAcompanhamento) => (
      <span
        className={`font-semibold ${
          linhaAcompanhamento.resumo.statusMargem === "ok" ? "text-success" : linhaAcompanhamento.resumo.statusMargem === "atencao" ? "text-warning" : "text-error"
        }`}
      >
        {formatPontos(linhaAcompanhamento.resumo.diferencaMargem).replace(" p.p.", "")}
      </span>
    ),
    ordenar: (linhaAcompanhamento) => linhaAcompanhamento.resumo.diferencaMargem,
  },
];

/** Meta de margem × margem atual por departamento, pior diferença primeiro. */
export function SituacaoMargem({ linhas, carregando }: { linhas: LinhaAcompanhamento[]; carregando: boolean }) {
  const comMeta = linhas
    .filter((linhaAcompanhamento) => linhaAcompanhamento.resumo.metaMargem != null && linhaAcompanhamento.resumo.margem != null)
    .sort((primeiro, segundo) => primeiro.resumo.diferencaMargem! - segundo.resumo.diferencaMargem!);
  return (
    <CardLista titulo="Situação da Margem Bruta" carregando={carregando}>
      {comMeta.length ? (
        <div className="max-h-[8.6rem] overflow-y-auto">
          <DataTable colunas={COLUNAS_MARGEM} linhas={comMeta} chave={(linhaAcompanhamento) => String(linhaAcompanhamento.codigo)} densidade="mini" />
        </div>
      ) : (
        <Vazio>Sem meta de margem por departamento.</Vazio>
      )}
    </CardLista>
  );
}
