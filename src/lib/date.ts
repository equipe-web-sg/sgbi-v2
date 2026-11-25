import type { AtalhoComparacao, Comparacao, Periodo } from "./filtros";

// Datas ISO (YYYY-MM-DD) manipuladas em UTC para não depender do fuso.

export function parseIso(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const dia = parseIso(iso);
  dia.setUTCDate(dia.getUTCDate() + days);
  return toIso(dia);
}

export function daysBetween(inicio: string, fim: string): number {
  return Math.round((parseIso(fim).getTime() - parseIso(inicio).getTime()) / 86_400_000);
}

export function daysInMonth(iso: string): number {
  const dia = parseIso(iso);
  return new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth() + 1, 0)).getUTCDate();
}

export function firstDayOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function lastDayOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-${String(daysInMonth(iso)).padStart(2, "0")}`;
}

/** Mês inteiro (do dia 1 ao último) da data `hoje`, pelo relógio local de quem a informa. */
export function periodoDoMes(hoje: Date): Periodo {
  const inicio = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  return { inicio, fim: lastDayOfMonth(inicio) };
}

/** Todos os dias de `inicio` a `fim`, inclusive. */
export function eachDay({ inicio, fim }: Periodo): string[] {
  const days: string[] = [];
  for (let dia = inicio; dia <= fim; dia = addDays(dia, 1)) days.push(dia);
  return days;
}

function isFullMonths({ inicio, fim }: Periodo) {
  return inicio.endsWith("-01") && fim === lastDayOfMonth(fim);
}

function shiftMonths(iso: string, months: number, edge: "start" | "end") {
  const dia = parseIso(iso);
  const shifted = new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth() + months, 1));
  const first = toIso(shifted);
  return edge === "start" ? first : lastDayOfMonth(first);
}

/** Mesma data `months` meses antes (dia limitado ao fim do mês: 31/03 → 28/02). */
function shiftDateMonths(iso: string, months: number) {
  const dia = parseIso(iso);
  const target = new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth() + months, 1));
  target.setUTCDate(Math.min(dia.getUTCDate(), daysInMonth(toIso(target))));
  return toIso(target);
}

/** Recua o período `months` meses; meses cheios continuam cheios (jul → jun inteiro). */
function recuarMeses(periodo: Periodo, months: number): Periodo {
  if (isFullMonths(periodo)) {
    return { inicio: shiftMonths(periodo.inicio, -months, "start"), fim: shiftMonths(periodo.fim, -months, "end") };
  }
  return { inicio: shiftDateMonths(periodo.inicio, -months), fim: shiftDateMonths(periodo.fim, -months) };
}

/** Período imediatamente anterior, do mesmo tamanho (meses cheios recuam em meses). */
function periodoAnterior(periodo: Periodo): Periodo {
  if (isFullMonths(periodo)) {
    const inicio = parseIso(periodo.inicio);
    const fim = parseIso(periodo.fim);
    const months =
      (fim.getUTCFullYear() - inicio.getUTCFullYear()) * 12 + fim.getUTCMonth() - inicio.getUTCMonth() + 1;
    return recuarMeses(periodo, months);
  }
  const length = daysBetween(periodo.inicio, periodo.fim) + 1;
  return { inicio: addDays(periodo.inicio, -length), fim: addDays(periodo.inicio, -1) };
}

/** Atalhos de comparação, sempre recuando a partir do período filtrado. */
export const ATALHOS_COMPARACAO: { id: AtalhoComparacao; label: string }[] = [
  { id: "periodo-anterior", label: "Mesmo período anterior" },
  { id: "semana-anterior", label: "Semana anterior" },
  { id: "mes-anterior", label: "Mês anterior" },
  { id: "trimestre-anterior", label: "Trimestre anterior" },
  { id: "ano-anterior", label: "Ano anterior" },
];

export function resolverAtalhoComparacao(periodo: Periodo, atalho: AtalhoComparacao): Periodo {
  switch (atalho) {
    case "periodo-anterior":
      return periodoAnterior(periodo);
    case "semana-anterior":
      return { inicio: addDays(periodo.inicio, -7), fim: addDays(periodo.fim, -7) };
    case "mes-anterior":
      return recuarMeses(periodo, 1);
    case "trimestre-anterior":
      return recuarMeses(periodo, 3);
    case "ano-anterior":
      return recuarMeses(periodo, 12);
  }
}

/** Período de comparação efetivo: atalho relativo ao período ou datas escolhidas. */
export function periodoComparacao(periodo: Periodo, comparacao: Comparacao): Periodo {
  return comparacao.tipo === "personalizado"
    ? comparacao.periodo
    : resolverAtalhoComparacao(periodo, comparacao.tipo);
}

/** Segunda-feira da semana do dia. */
export function startOfWeek(iso: string): string {
  const weekday = (parseIso(iso).getUTCDay() + 6) % 7;
  return addDays(iso, -weekday);
}

/** Meses (YYYY-MM) que o período cobre. */
export function mesesDoPeriodo(periodo: Periodo): string[] {
  const meses: string[] = [];
  for (let mes = periodo.inicio.slice(0, 7); mes <= periodo.fim.slice(0, 7); ) {
    meses.push(mes);
    const [ano, numeroMes] = mes.split("-").map(Number);
    mes = numeroMes === 12 ? `${ano + 1}-01` : `${ano}-${String(numeroMes + 1).padStart(2, "0")}`;
  }
  return meses;
}
