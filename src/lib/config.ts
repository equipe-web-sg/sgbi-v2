import { periodoDoMes } from "./date";
import type { Periodo } from "./filtros";

/**
 * Período inicial das telas: o mês atual inteiro (do dia 1 ao último dia), pelo relógio
 * do navegador. Chame ao abrir a tela (`useState(() => ...)`), não no escopo do módulo,
 * para não congelar o mês do momento em que o código foi carregado.
 * Em P7 (docs/decisoes-e-pendencias.md) está a proposta de ir só até ontem.
 */
export const periodoPadrao = (): Periodo => periodoDoMes(new Date());
