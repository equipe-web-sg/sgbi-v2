import { formatDecimal, formatMoeda, formatPercentual, formatPontos } from "@/lib/format";
import { METAS_CONFIG } from "./config";
import type { ResumoMeta } from "./compute";

/**
 * Textos dos balões das situações da tela de Metas (ritmo da meta e margem). Ajuste aqui as frases quando a área
 * de negócio redefinir os critérios (os limites em si ficam em `config.ts`).
 */
const pontos = (valor: number) => `${formatDecimal(valor)} p.p.`;

/** Situação contra o ritmo da meta: o critério e os números da linha. */
export function explicarStatusMeta(resumo: Pick<ResumoMeta, "status" | "realizado" | "metaEsperada">): string[] {
  const { acimaDe, noRitmoDe } = METAS_CONFIG.ritmo;
  const ritmo = resumo.metaEsperada ? (resumo.realizado / resumo.metaEsperada) * 100 : null;
  const numeros = `Realizado de ${formatMoeda(resumo.realizado)} contra ${formatMoeda(resumo.metaEsperada)} esperados até a data (${formatPercentual(ritmo)}).`;
  switch (resumo.status) {
    case "acima":
      return [`Acima: o realizado é ${formatPercentual(acimaDe)} ou mais da meta esperada até a data.`, numeros];
    case "no-ritmo":
      return [`No ritmo: o realizado está entre ${formatPercentual(noRitmoDe)} e ${formatPercentual(acimaDe)} da meta esperada até a data.`, numeros];
    case "abaixo":
      return [`Abaixo: o realizado está abaixo de ${formatPercentual(noRitmoDe)} da meta esperada até a data.`, numeros];
    case "aguardando":
      return ["Aguardando: o período ainda não tem dias com venda para comparar com a meta."];
    case "sem-meta":
      return ["Sem meta: não há meta de venda cadastrada para este período."];
  }
}

/** Situação da margem contra a meta de margem: o critério e os números da linha. */
export function explicarStatusMargem(resumo: Pick<ResumoMeta, "statusMargem" | "margem" | "metaMargem" | "diferencaMargem">): string[] {
  const { okAte, atencaoAte } = METAS_CONFIG.margem;
  const numeros = `Margem atual de ${formatPercentual(resumo.margem)} contra a meta de ${formatPercentual(resumo.metaMargem)} (${formatPontos(resumo.diferencaMargem)}).`;
  switch (resumo.statusMargem) {
    case "ok":
      return [`Ok: a margem está acima da meta ou até ${pontos(okAte)} abaixo dela.`, numeros];
    case "atencao":
      return [`Atenção: a margem está entre ${pontos(okAte)} e ${pontos(atencaoAte)} abaixo da meta.`, numeros];
    case "critico":
      return [`Crítico: a margem está mais de ${pontos(atencaoAte)} abaixo da meta.`, numeros];
    case "sem-meta":
      return ["Sem meta: falta a meta de margem ou a margem do período para comparar."];
  }
}
