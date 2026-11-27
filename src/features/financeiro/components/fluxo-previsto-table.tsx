"use client";

import Icon from "@mdi/react";
import { mdiCalendarArrowRight, mdiDownload } from "@mdi/js";
import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Segmented } from "@/components/ui/segmented";
import { VerTodos } from "@/components/ui/ver-todos";
import { baixarCsv } from "@/lib/csv";
import { parseIso } from "@/lib/date";
import { formatDiaMes, formatMesAno, formatMoeda } from "@/lib/format";
import { fluxoPrevisto, type Granularidade, type LinhaPrevista } from "../compute";
import type { Movimento } from "../types";

const GRANULARIDADES: { value: Granularidade; label: string }[] = [
  { value: "dia", label: "Diário" },
  { value: "semana", label: "Semanal" },
  { value: "mes", label: "Mensal" },
];

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function rotulo(linhaPrevista: LinhaPrevista, granularidade: Granularidade) {
  if (granularidade === "mes") return formatMesAno(linhaPrevista.chave);
  if (granularidade === "semana") return `${formatDiaMes(linhaPrevista.inicio)} – ${formatDiaMes(linhaPrevista.fim)}`;
  return `${SEMANA[parseIso(linhaPrevista.inicio).getUTCDay()]} ${formatDiaMes(linhaPrevista.inicio)}`;
}

const STATUS = {
  ok: { label: "Ok", classe: "text-success", ponto: "bg-success" },
  atencao: { label: "Atenção", classe: "text-warning", ponto: "bg-warning" },
  critico: { label: "Crítico", classe: "text-error", ponto: "bg-error" },
} as const;

const ORDEM_STATUS = { ok: 0, atencao: 1, critico: 2 } as const;

function colunasFluxo(granularidade: Granularidade): Coluna<LinhaPrevista>[] {
  return [
    { id: "data", titulo: "Data", align: "left", className: "font-medium", cell: (linhaPrevista) => rotulo(linhaPrevista, granularidade), ordenar: (linhaPrevista) => linhaPrevista.inicio },
    { id: "entradas", titulo: "Entradas previstas", cell: (linhaPrevista) => formatMoeda(linhaPrevista.entradas), ordenar: (linhaPrevista) => linhaPrevista.entradas },
    { id: "saidas", titulo: "Saídas previstas", cell: (linhaPrevista) => formatMoeda(linhaPrevista.saidas), ordenar: (linhaPrevista) => linhaPrevista.saidas },
    {
      id: "saldo",
      titulo: `Saldo do ${granularidade === "dia" ? "dia" : "período"}`,
      cell: (linhaPrevista) => <span className={linhaPrevista.saldo < 0 ? "text-error" : "text-success"}>{formatMoeda(linhaPrevista.saldo)}</span>,
      ordenar: (linhaPrevista) => linhaPrevista.saldo,
    },
    {
      id: "acumulado",
      titulo: "Acumulado",
      dica: "Acumulado a partir da referência, sem o saldo bancário de hoje",
      cell: (linhaPrevista) => <span className={linhaPrevista.acumulado < 0 ? "text-error" : ""}>{formatMoeda(linhaPrevista.acumulado)}</span>,
      ordenar: (linhaPrevista) => linhaPrevista.acumulado,
    },
    {
      id: "status",
      titulo: "Status",
      align: "left",
      cell: (linhaPrevista) => {
        const situacao = STATUS[linhaPrevista.status];
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${situacao.classe}`}>
            <span className={`size-2 rounded-full ${situacao.ponto}`} aria-hidden />
            {situacao.label}
          </span>
        );
      },
      ordenar: (linhaPrevista) => ORDEM_STATUS[linhaPrevista.status],
    },
  ];
}

/** Fluxo previsto dos próximos dias: só títulos em aberto e cartões a liquidar (P43). */
export function FluxoPrevistoTable({
  movimentos,
  referencia,
  dias,
  carregando,
}: {
  movimentos: Movimento[];
  referencia: string;
  dias: number;
  carregando: boolean;
}) {
  const [granularidade, setGranularidade] = useState<Granularidade>("dia");
  const linhas = fluxoPrevisto(movimentos, referencia, dias, granularidade);

  const exportar = () =>
    baixarCsv(
      `fluxo-previsto-${referencia}.csv`,
      [
        "Período",
        "Entradas previstas (R$)",
        "Saídas previstas (R$)",
        "Saldo do período (R$)",
        "Acumulado (R$)",
        "Status",
      ],
      linhas.map((linhaPrevista) => [rotulo(linhaPrevista, granularidade), linhaPrevista.entradas, linhaPrevista.saidas, linhaPrevista.saldo, linhaPrevista.acumulado, STATUS[linhaPrevista.status].label]),
    );

  // Os controles da tabela são os mesmos no card e na janela "Ver todos" (o estado é do card).
  const controles = (
    <>
      <Segmented label="Agrupamento" value={granularidade} options={GRANULARIDADES} onChange={setGranularidade} />
      <button
        type="button"
        onClick={exportar}
        disabled={!linhas.length}
        className="flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm font-medium shadow-xs transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
      >
        <Icon path={mdiDownload} size={0.75} aria-hidden />
        Exportar
      </button>
    </>
  );
  const tabela = <DataTable colunas={colunasFluxo(granularidade)} linhas={linhas} chave={(linhaPrevista) => linhaPrevista.chave} />;
  const titulo = `Fluxo de Caixa Previsto · Próximos ${dias} dias`;

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon path={mdiCalendarArrowRight} size={0.9} className="text-primary" aria-hidden />
          {titulo}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {controles}
          <VerTodos
            titulo={titulo}
            descricao="Entradas e saídas previstas (títulos em aberto e cartões a liquidar), com o acumulado a partir da referência."
            filtros={controles}
            desabilitado={!linhas.length}
            carregando={carregando}
          >
            {tabela}
          </VerTodos>
        </div>
      </CardHeader>
      <div className="relative flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2" aria-busy={carregando}>
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
          {tabela}
        </div>
        <LoadingOverlay ativo={carregando} className="z-20 rounded-b-2xl" />
      </div>
    </Card>
  );
}
