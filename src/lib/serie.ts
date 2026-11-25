import { startOfWeek } from "./date";
import type { Granularidade } from "./filtros";

/** Um ponto de série comparativa: período atual × período de comparação. */
export type PontoComparativo = {
  /** Rótulo do eixo X (início do intervalo do período atual). */
  chave: string;
  dataAtual: string | null;
  dataAnterior: string | null;
  atual: number | null;
  anterior: number | null;
};

function chaveDe(data: string, granularidade: Granularidade) {
  if (granularidade === "semana") return startOfWeek(data);
  if (granularidade === "mes") return data.slice(0, 7);
  return data;
}

function agrupar<T extends { data: string }>(
  dias: T[],
  granularidade: Granularidade,
  medida: (dias: T[]) => number | null,
) {
  const grupos = new Map<string, T[]>();
  for (const dia of dias) {
    const chave = chaveDe(dia.data, granularidade);
    grupos.set(chave, [...(grupos.get(chave) ?? []), dia]);
  }
  return [...grupos.values()].map((itens) => ({ inicio: itens[0].data, valor: medida(itens) }));
}

/**
 * Agrupa os dias por dia/semana/mês e alinha atual e anterior pela posição
 * do intervalo (1º dia com 1º dia...). `medida` devolve null quando não há carga.
 */
export function evolucaoComparativa<T extends { data: string }>(
  atual: T[],
  anterior: T[],
  granularidade: Granularidade,
  medida: (dias: T[]) => number | null,
): PontoComparativo[] {
  const grupoAtual = agrupar(atual, granularidade, medida);
  const grupoAnterior = agrupar(anterior, granularidade, medida);
  return Array.from({ length: Math.max(grupoAtual.length, grupoAnterior.length) }, (_, indice) => ({
    chave: grupoAtual[indice]?.inicio ?? grupoAnterior[indice].inicio,
    dataAtual: grupoAtual[indice]?.inicio ?? null,
    dataAnterior: grupoAnterior[indice]?.inicio ?? null,
    atual: grupoAtual[indice]?.valor ?? null,
    anterior: grupoAnterior[indice]?.valor ?? null,
  }));
}
