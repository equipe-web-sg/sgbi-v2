"use client";

import { DEBOUNCE_GRAFICO } from "@/components/charts/estilo";
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

function tooltipSerie(kind: Tipo, format: (value: number) => string) {
  return (
    <Tooltip
      cursor={kind === "bar" ? { fill: "var(--muted)", opacity: 0.4 } : { stroke: "var(--border)" }}
      allowEscapeViewBox={{ x: true, y: true }}
      wrapperStyle={{ zIndex: 60 }}
      content={({ active, payload }) => {
        const ponto = payload?.[0]?.payload as Ponto | undefined;
        if (!active || !ponto || ponto.valor == null) return null;
        return (
          <div className="rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md">
            <span className="text-muted-foreground">{formatDiaMes(ponto.data)} · </span>
            <span className="font-semibold tabular-nums">{format(ponto.valor)}</span>
          </div>
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
            dot={{ r: 3, fill: color, stroke: "var(--card)", strokeWidth: 1.5 }}
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
  if (!data.some((p) => p.valor != null)) return null;

  return (
    <div className="h-9 w-12 shrink-0 @[20rem]:w-20">
      <div className="size-full" role="img" aria-label={`${label}: evolução diária`}>
        <ResponsiveContainer width="100%" height="100%" debounce={DEBOUNCE_GRAFICO}>
          {kind === "bar" ? (
            <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap={1}>
              {tooltipSerie(kind, format)}
              <Bar dataKey="valor" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
              {tooltipSerie(kind, format)}
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
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
