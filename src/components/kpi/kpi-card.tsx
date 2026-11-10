"use client";

import { InfoTooltip } from "@/components/ui/tooltip";
import Icon from "@mdi/react";
import { mdiArrowDownBold, mdiArrowUpBold, mdiMinus } from "@mdi/js";
import { isValidElement, useState, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import { LegendaGrafico } from "@/components/charts/legenda-grafico";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { eixoDoSparkline, SerieDetalhada, type SparklineProps } from "./sparkline";
import { formatPontos, formatVariacao } from "@/lib/format";

export type Tom = "green" | "gold" | "pink" | "blue" | "purple" | "teal" | "orange" | "coral";

// Classes completas (o Tailwind não gera classes montadas dinamicamente).
const TONS: Record<Tom, { bg: string; icon: string; color: string }> = {
  green: { bg: "bg-summary-green-bg", icon: "text-summary-green-icon", color: "var(--summary-green-icon)" },
  gold: { bg: "bg-summary-gold-bg", icon: "text-summary-gold-icon", color: "var(--summary-gold-icon)" },
  pink: { bg: "bg-summary-pink-bg", icon: "text-summary-pink-icon", color: "var(--summary-pink-icon)" },
  blue: { bg: "bg-summary-blue-bg", icon: "text-summary-blue-icon", color: "var(--summary-blue-icon)" },
  purple: { bg: "bg-summary-purple-bg", icon: "text-summary-purple-icon", color: "var(--summary-purple-icon)" },
  teal: { bg: "bg-summary-teal-bg", icon: "text-summary-teal-icon", color: "var(--summary-teal-icon)" },
  orange: { bg: "bg-summary-orange-bg", icon: "text-summary-orange-icon", color: "var(--summary-orange-icon)" },
  coral: { bg: "bg-summary-coral-bg", icon: "text-summary-coral-icon", color: "var(--summary-coral-icon)" },
};

export function corDoTom(tom: Tom) {
  return TONS[tom].color;
}

/** Variação colorida pelo sentido bom/ruim, sempre com seta (não só cor). */
export function Delta({
  value,
  unidade,
  maiorMelhor,
}: {
  value: number | null;
  unidade: "%" | "pp";
  maiorMelhor: boolean;
}) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="text-xs text-muted-foreground">sem comparação</span>;
  }
  const neutro = Math.abs(value) < 0.005;
  const bom = value > 0 === maiorMelhor;
  const cor = neutro ? "text-muted-foreground" : bom ? "text-success" : "text-error";
  const icone = neutro ? mdiMinus : value > 0 ? mdiArrowUpBold : mdiArrowDownBold;
  return (
    // Texto inline (não flex): o número fica na mesma linha de base dos valores vizinhos
    // (em tabela, um inline-flex se alinha pela base do ícone e o texto "sobe").
    <span className={`whitespace-nowrap text-xs font-semibold tabular-nums ${cor}`}>
      <Icon path={icone} size={0.55} className="mr-0.5 inline-block align-[-0.15em]" aria-hidden />
      {unidade === "%" ? formatVariacao(value) : formatPontos(value)}
    </span>
  );
}

/**
 * Card de KPI. Clicar nele (ou Enter/Espaço com foco) abre uma janela de detalhe
 * com o valor, a comparação e a série diária ampliada, que vem do `Sparkline`
 * passado em `grafico` (o card lê as propriedades do elemento). Com pouca altura
 * (`data-altura="minima"`, bloco da grade personalizável), mostra só o ícone, na
 * cor do KPI, e o nome: o clique continua levando ao detalhe.
 */
export function KpiCard({
  titulo,
  ajuda,
  icone,
  tom,
  valor,
  linhas,
  grafico,
  badge,
  carregando,
  linhasLongas,
}: {
  titulo: string;
  ajuda: string;
  icone: string;
  tom: Tom;
  valor: ReactNode;
  /** Linhas abaixo do valor (variação, base de comparação, % da venda...). */
  linhas?: ReactNode;
  /** Um `<Sparkline>` (ou `false`/`undefined`): é o minigráfico do card e, ampliado, o gráfico do detalhe. */
  grafico?: ReactNode;
  badge?: string;
  carregando?: boolean;
  /**
   * `linhas` com várias informações (quebram em 2 ou 3 linhas): em card estreito ficam só no detalhe,
   * para não empurrar o valor por cima do título.
   */
  linhasLongas?: boolean;
}) {
  const t = TONS[tom];
  const [aberto, setAberto] = useState(false);
  const serie = isValidElement(grafico) ? (grafico as ReactElement<SparklineProps>).props : null;
  const comSerie = !!serie?.data?.some((p) => p.valor != null);

  const aoTeclar = (e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    setAberto(true);
  };

  return (
    <>
      <article
        role="button"
        tabIndex={carregando ? -1 : 0}
        aria-busy={!!carregando}
        aria-haspopup="dialog"
        aria-label={`Ver detalhes: ${titulo}`}
        onClick={() => !carregando && setAberto(true)}
        onKeyDown={aoTeclar}
        className={`@container relative flex min-w-0 cursor-pointer flex-col rounded-2xl border bg-card px-3 py-2 text-card-foreground shadow-md outline-none transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring [[data-altura=minima]_&]:flex-row [[data-altura=minima]_&]:items-center [[data-altura=minima]_&]:gap-2 [[data-altura=minima]_&]:py-1`}
      >
        {/* Altura mínima (bloco da grade personalizável): só o ícone colorido e o nome. */}
        <div className="flex min-w-0 items-center gap-2 [[data-altura=minima]_&]:flex-1">
          <div
            className={`flex size-7 shrink-0 items-center justify-center rounded-lg [[data-altura=minima]_&]:size-6 ${t.bg}`}
          >
            <Icon path={icone} size={0.75} className={t.icon} aria-hidden />
          </div>
          <h3 className="min-w-0 truncate text-[13px] font-semibold" title={titulo}>
            {titulo}
          </h3>
          {/* O balão de ajuda não abre o detalhe. */}
          <span onClick={(e) => e.stopPropagation()} className="contents [[data-altura=minima]_&]:hidden">
            <InfoTooltip texto={ajuda} />
          </span>
          {badge && (
            <span className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground [[data-altura=minima]_&]:hidden">
              {badge}
            </span>
          )}
        </div>
        {/* Minigráfico ao lado do valor e da variação: o card fica mais baixo. */}
        <div className="mt-0.5 flex min-h-0 flex-1 items-end-safe justify-between gap-2 overflow-hidden [[data-altura=minima]_&]:hidden">
          <div className="min-w-0 flex-1">
            {/* Valores com centavos são longos: fonte menor em cards estreitos (container query). */}
            <div
              className={`truncate text-sm font-bold tabular-nums tracking-tight @[12rem]:text-base @[14rem]:text-lg leading-6 ${linhasLongas ? "" : "@[20rem]:text-xl"}`}
            >
              {valor}
            </div>
            <div
              className={`flex min-h-4 min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground [[data-altura=baixa]_&]:hidden @max-[19rem]:[&_*]:text-[11px]! @max-[15rem]:[&_*]:text-[10px]! ${linhasLongas ? "@max-[16rem]:hidden [[data-altura=media]_&]:hidden" : ""}`}
            >
              {linhas}
            </div>
          </div>
          {/* KPI estreito ou baixo (bloco da grade personalizável): sem minigráfico, para não apertar o valor. */}
          {grafico && (
            <div className="shrink-0 @max-[13rem]:hidden [[data-altura=baixa]_&]:hidden">{grafico}</div>
          )}
        </div>
        {/* Cobre o card inteiro: os dados antigos (ou vazios) não ficam legíveis. */}
        <LoadingOverlay ativo={!!carregando} label={titulo} className="rounded-2xl" />
      </article>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent titulo={titulo} descricao={ajuda} className="max-w-3xl">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
            <div className="flex items-center gap-3">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${t.bg}`}>
                <Icon path={icone} size={1} className={t.icon} aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold tabular-nums tracking-tight">{valor}</div>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                  {linhas}
                </div>
              </div>
              {badge && (
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                  {badge}
                </span>
              )}
            </div>
            {comSerie && serie && (
              <>
                <LegendaGrafico
                  grande
                  itens={[{ nome: serie.label, cor: serie.color, forma: serie.kind === "bar" ? "quadrado" : "linha" }]}
                />
                <div className="h-[min(50vh,420px)] min-h-64 rounded-xl border px-2 py-3">
                  <SerieDetalhada
                    data={serie.data}
                    kind={serie.kind}
                    color={serie.color}
                    format={serie.format}
                    formatEixo={eixoDoSparkline(serie)}
                  />
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Mensagem no lugar do valor quando não há dados. */
export function SemDados({ children }: { children: ReactNode }) {
  return <span className="text-sm font-medium text-muted-foreground">{children}</span>;
}
