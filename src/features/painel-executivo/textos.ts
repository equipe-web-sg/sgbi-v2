import { formatDecimal, formatPercentual, formatPontos } from "@/lib/format";
import { PAINEL_CONFIG } from "./config";
import type { LinhaCalculada, Situacao } from "./compute";

/**
 * Textos do balão da coluna Situação (Compra sobre Venda). Ajuste aqui as frases quando a área de negócio
 * redefinir os critérios (os limites em si ficam em `config.ts`).
 */
const pontos = (valor: number) => `${formatDecimal(valor)} p.p.`;

const CRITERIO: Record<Situacao, () => string> = {
  bom: () => `Bom: a variação, para mais ou para menos, é de até ${pontos(PAINEL_CONFIG.situacao.bomAtePp)}.`,
  atencao: () =>
    `Atenção: a variação passa de ${pontos(PAINEL_CONFIG.situacao.bomAtePp)} e vai até ${pontos(PAINEL_CONFIG.situacao.atencaoAtePp)}.`,
  critico: () => `Crítico: a variação passa de ${pontos(PAINEL_CONFIG.situacao.atencaoAtePp)}.`,
};

/** Frases do balão: o critério da situação e os números da linha. */
export function explicarSituacao(linha: Pick<LinhaCalculada, "situacao" | "compraSobreVenda" | "compraSobreVendaAnterior" | "variacaoPp">) {
  if (!linha.situacao) {
    return ["Sem situação: não há compra e venda nos dois períodos para comparar."];
  }
  return [
    CRITERIO[linha.situacao](),
    `Compra sobre venda: ${formatPercentual(linha.compraSobreVenda)} contra ${formatPercentual(linha.compraSobreVendaAnterior)} no período de comparação (${formatPontos(linha.variacaoPp)}).`,
  ];
}
