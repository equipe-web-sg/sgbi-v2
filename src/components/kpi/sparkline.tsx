"use client";

import { DEBOUNCE_GRAFICO } from "@/components/charts/estilo";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { propsEixoX, propsEixoY, propsGrade } from "@/components/charts/estilo";
import { formatDiaMes, formatMoeda, formatMoedaCompacta } from "@/lib/format";

export type Ponto = { data: string; valor: number | null };
export type Tipo = "bar" | "area";

/** Posição do ponteiro na janela (px), para o balão do minigráfico. */
type Ponteiro = { coluna: number; linha: number };

const CLASSE_BALAO = "rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md";

/**
 * Balão de um ponto da série. No minigráfico (`ponteiro` definido, mesmo que ainda nulo) ele é desenhado fora do card,
 * no `body`, com posição fixa junto ao ponteiro: o card corta (`overflow-hidden`) o que passa da borda dele, e o
 * balão sumia. Na janela de detalhe (`ponteiro` indefinido) o Recharts o posiciona dentro do gráfico e ele vira para a
 * esquerda no fim do gráfico, porque a janela também corta o que passa da borda.
 */
function tooltipSerie(kind: Tipo, format: (value: number) => string, ponteiro?: Ponteiro | null) {
  const miniatura = ponteiro !== undefined;
  return (
    <Tooltip
      cursor={kind === "bar" ? { fill: "var(--muted)", opacity: 0.4 } : { stroke: "var(--border)" }}
      // eslint-disable-next-line id-length -- nomes da API do Recharts (r, x, y)
      allowEscapeViewBox={{ x: miniatura, y: true }}
      wrapperStyle={{ zIndex: 60 }}
      content={({ active, payload }) => {
        const ponto = payload?.[0]?.payload as Ponto | undefined;
        if (!active || !ponto || ponto.valor == null) return null;
        const conteudo = (
          <>
            <span className="text-muted-foreground">{formatDiaMes(ponto.data)} · </span>
            <span className="font-semibold tabular-nums">{format(ponto.valor)}</span>
          </>
        );
        if (!miniatura) return <div className={CLASSE_BALAO}>{conteudo}</div>;
        if (!ponteiro) return null;
        return createPortal(
          <div
            className={`pointer-events-none fixed z-[60] whitespace-nowrap ${CLASSE_BALAO}`}
            // Centralizado sobre o ponteiro, sem sair da janela dos lados.
            style={{
              left: Math.min(Math.max(ponteiro.coluna, 70), window.innerWidth - 70),
              top: ponteiro.linha,
              transform: "translate(-50%, calc(-100% - 14px))",
            }}
          >
            {conteudo}
          </div>,
          document.body,
        );
      }}
    />
  );
}

/** Série diária com eixos, grade e valores, para a janela de detalhe do KPI (`KpiCard`). */
export function SerieDetalhada({
  data,
  kind,
  color,
  format,
  formatEixo,
}: {
  data: Ponto[];
  kind: Tipo;
  color: string;
  format: (value: number) => string;
  formatEixo: (value: number) => string;
}) {
  const eixos = (
    <>
      <CartesianGrid {...propsGrade(true)} />
      <XAxis dataKey="data" tickFormatter={formatDiaMes} {...propsEixoX(true)} />
      <YAxis tickFormatter={formatEixo} width={84} {...propsEixoY(true)} />
      {tooltipSerie(kind, format)}
    </>
  );
  return (
    <ResponsiveContainer width="100%" height="100%" debounce={DEBOUNCE_GRAFICO}>
      {kind === "bar" ? (
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          {eixos}
          <Bar dataKey="valor" fill={color} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
        </BarChart>
      ) : (
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          {eixos}
          <Area
            type="linear"
            dataKey="valor"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.15}
            connectNulls
            isAnimationActive={false}
            // eslint-disable-next-line id-length -- nomes da API do Recharts (r, x, y)
            dot={{ r: 3, fill: color, stroke: "var(--card)", strokeWidth: 1.5 }}
            // eslint-disable-next-line id-length -- nomes da API do Recharts (r, x, y)
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}

export type SparklineProps = {
  data: Ponto[];
  kind: Tipo;
  color: string;
  format: (value: number) => string;
  /** Rótulos do eixo Y da janela de detalhe (padrão: `format`; valores em R$ usam a forma compacta). */
  formatEixo?: (value: number) => string;
  label: string;
};

/** Eixo Y da janela de detalhe de um KPI (valores em R$ usam a forma compacta). */
export const eixoDoSparkline = ({ format, formatEixo }: Pick<SparklineProps, "format" | "formatEixo">) =>
  formatEixo ?? (format === formatMoeda ? formatMoedaCompacta : format);

/**
 * Minigráfico diário do card de KPI, com tooltip por dia. Clicar não o amplia:
 * o card inteiro abre a janela de detalhe (valor e série com eixos), ver
 * `KpiCard`, que lê as propriedades deste elemento.
 */
export function Sparkline({ data, kind, color, format, label }: SparklineProps) {
  const [ponteiro, setPonteiro] = useState<Ponteiro | null>(null);
  if (!data.some((ponto) => ponto.valor != null)) return null;

  return (
    <div className="h-9 w-12 shrink-0 @[20rem]:w-20">
      <div
        className="size-full"
        role="img"
        aria-label={`${label}: evolução diária`}
        onPointerMove={(evento) => setPonteiro({ coluna: evento.clientX, linha: evento.clientY })}
        onPointerLeave={() => setPonteiro(null)}
      >
        <ResponsiveContainer width="100%" height="100%" debounce={DEBOUNCE_GRAFICO}>
          {kind === "bar" ? (
            <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap={1}>
              {tooltipSerie(kind, format, ponteiro)}
              <Bar dataKey="valor" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
              {tooltipSerie(kind, format, ponteiro)}
              <Area
                type="linear"
                dataKey="valor"
                stroke={color}
                strokeWidth={1.5}
                fill={color}
                fillOpacity={0.15}
                connectNulls
                isAnimationActive={false}
                dot={false}
                // eslint-disable-next-line id-length -- nomes da API do Recharts (r, x, y)
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
