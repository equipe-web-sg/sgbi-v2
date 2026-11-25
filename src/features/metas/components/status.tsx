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

function Selo({ configuracao, destaque, compacto }: { configuracao: (typeof META)[StatusMeta]; destaque?: boolean; compacto?: boolean }) {
  if (compacto) {
    // Tabelas pequenas: só o ponto e o texto, sem fundo (linha mais baixa).
    return (
      <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-medium ${configuracao.texto}`} title={configuracao.label}>
        <span className={`size-2 rounded-full ${configuracao.ponto}`} aria-hidden />
        {/* Card estreito (container query): só o ponto; o texto fica no título e para leitores de tela. */}
        <span className="sr-only @[26rem]:not-sr-only">{configuracao.label}</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 align-middle text-xs font-medium ${configuracao.fundo} ${configuracao.texto} ${destaque ? "px-3 py-1 text-sm font-semibold" : ""}`}
    >
      <span className={`size-1.5 rounded-full ${configuracao.ponto}`} aria-hidden />
      {configuracao.label}
    </span>
  );
}

/** Situação contra o ritmo da meta (com ponto colorido e texto, não só cor). */
export function StatusMetaBadge({
  status,
  destaque,
  compacto,
}: {
  status: StatusMeta;
  destaque?: boolean;
  compacto?: boolean;
}) {
  return <Selo configuracao={META[status]} destaque={destaque} compacto={compacto} />;
}

export function StatusMargemBadge({ status }: { status: StatusMargem }) {
  return <Selo configuracao={MARGEM[status]} />;
}

/** Situações possíveis da margem, para a legenda de pontos no cabeçalho da tabela. */
export const PONTOS_MARGEM = (["ok", "atencao", "critico"] as const).map((chave) => ({
  label: MARGEM[chave].label,
  classe: MARGEM[chave].ponto,
}));

/** Posição de cada situação para ordenar as tabelas (da melhor para a pior). */
export const ORDEM_STATUS = { acima: 0, "no-ritmo": 1, abaixo: 2, aguardando: 3, "sem-meta": 4 } as const satisfies Record<StatusMeta, number>;
export const ORDEM_MARGEM = { ok: 0, atencao: 1, critico: 2, "sem-meta": 3 } as const satisfies Record<StatusMargem, number>;
