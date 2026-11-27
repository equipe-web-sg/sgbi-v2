import type { ReactNode } from "react";
import { LinhasTooltip, Tooltip } from "@/components/ui/tooltip";
import type { StatusMargem, StatusMeta } from "../types";

// Classes completas (o Tailwind não gera classes montadas dinamicamente).
const META: Record<StatusMeta, { label: string; ponto: string; fundo: string; texto: string }> = {
  acima: { label: "Acima", ponto: "bg-success", fundo: "bg-positive-highlight", texto: "text-success" },
  "no-ritmo": { label: "No ritmo", ponto: "bg-info", fundo: "bg-summary-blue-bg", texto: "text-info" },
  abaixo: { label: "Abaixo", ponto: "bg-error", fundo: "bg-negative-highlight", texto: "text-error" },
  aguardando: { label: "Aguardando", ponto: "bg-muted-foreground", fundo: "bg-secondary", texto: "text-muted-foreground" },
  "sem-meta": { label: "Sem meta", ponto: "bg-muted-foreground", fundo: "bg-secondary", texto: "text-muted-foreground" },
};

const MARGEM: Record<StatusMargem, { label: string; ponto: string; fundo: string; texto: string }> = {
  ok: { label: "Ok", ponto: "bg-success", fundo: "bg-positive-highlight", texto: "text-success" },
  atencao: { label: "Atenção", ponto: "bg-warning", fundo: "bg-summary-orange-bg", texto: "text-warning" },
  critico: { label: "Crítico", ponto: "bg-error", fundo: "bg-negative-highlight", texto: "text-error" },
  "sem-meta": { label: "Sem meta", ponto: "bg-muted-foreground", fundo: "bg-secondary", texto: "text-muted-foreground" },
};

export const ROTULO_STATUS = Object.fromEntries(Object.entries(META).map(([chave, configuracao]) => [chave, configuracao.label])) as Record<StatusMeta, string>;

function Selo({
  configuracao,
  destaque,
  compacto,
  explicacao,
}: {
  configuracao: (typeof META)[StatusMeta];
  destaque?: boolean;
  compacto?: boolean;
  /** Frases do balão (primeira em destaque): o critério da situação e os números da linha (textos em `../textos.ts`). */
  explicacao?: string[];
}) {
  const selo = compacto ? (
    // Tabelas pequenas: só o ponto e o texto, sem fundo (linha mais baixa).
    <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium ${configuracao.texto}`} title={explicacao ? undefined : configuracao.label}>
      <span className={`size-2 rounded-full ${configuracao.ponto}`} aria-hidden />
      {/* Card estreito (container query): só o ponto; o texto fica no balão e para leitores de tela. */}
      <span className="sr-only @[26rem]:not-sr-only">{configuracao.label}</span>
    </span>
  ) : (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 align-middle text-xs font-medium ${configuracao.fundo} ${configuracao.texto} ${destaque ? "px-3 py-1 text-sm font-semibold" : ""}`}
    >
      <span className={`size-1.5 rounded-full ${configuracao.ponto}`} aria-hidden />
      {configuracao.label}
    </span>
  );
  if (!explicacao) return selo;
  return <ComBalao explicacao={explicacao}>{selo}</ComBalao>;
}

/** Foco por teclado e balão no selo (o `span` do selo recebe as props do gatilho). */
function ComBalao({ explicacao, children }: { explicacao: string[]; children: ReactNode }) {
  return (
    <Tooltip conteudo={<LinhasTooltip linhas={explicacao} />}>
      <span tabIndex={0} className="inline-flex cursor-help rounded-md outline-none focus-visible:outline-2 focus-visible:outline-ring">
        {children}
      </span>
    </Tooltip>
  );
}

/** Situação contra o ritmo da meta (com ponto colorido e texto, não só cor). */
export function StatusMetaBadge({
  status,
  destaque,
  compacto,
  explicacao,
}: {
  status: StatusMeta;
  destaque?: boolean;
  compacto?: boolean;
  explicacao?: string[];
}) {
  return <Selo configuracao={META[status]} destaque={destaque} compacto={compacto} explicacao={explicacao} />;
}

export function StatusMargemBadge({ status, explicacao }: { status: StatusMargem; explicacao?: string[] }) {
  return <Selo configuracao={MARGEM[status]} explicacao={explicacao} />;
}

/** Situações possíveis da margem, para a legenda de pontos no cabeçalho da tabela. */
export const PONTOS_MARGEM = (["ok", "atencao", "critico"] as const).map((chave) => ({
  label: MARGEM[chave].label,
  classe: MARGEM[chave].ponto,
}));

/** Posição de cada situação para ordenar as tabelas (da melhor para a pior). */
export const ORDEM_STATUS = { acima: 0, "no-ritmo": 1, abaixo: 2, aguardando: 3, "sem-meta": 4 } as const satisfies Record<StatusMeta, number>;
export const ORDEM_MARGEM = { ok: 0, atencao: 1, critico: 2, "sem-meta": 3 } as const satisfies Record<StatusMargem, number>;
