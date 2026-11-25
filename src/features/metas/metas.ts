import { daysBetween, daysInMonth, lastDayOfMonth, mesesDoPeriodo } from "@/lib/date";
import type { MetaDia, Periodo } from "./types";

export type MetaMensal = { codigo: number; mes: string; meta: number; metaLucro: number };

const dias = (periodo: Periodo) => daysBetween(periodo.inicio, periodo.fim) + 1;

function intersecao(primeiro: Periodo, segundo: Periodo): Periodo | null {
  const inicio = primeiro.inicio > segundo.inicio ? primeiro.inicio : segundo.inicio;
  const fim = primeiro.fim < segundo.fim ? primeiro.fim : segundo.fim;
  return inicio <= fim ? { inicio, fim } : null;
}

/** Soma da meta diária no período; null quando nenhum dia do período tem meta cadastrada. */
export function somaMetaDiaria(metas: MetaDia[], periodo: Periodo | null): { meta: number; metaLucro: number } | null {
  if (!periodo) return null;
  let meta = 0;
  let metaLucro = 0;
  let encontrou = false;
  for (const metaDia of metas) {
    if (metaDia.data < periodo.inicio || metaDia.data > periodo.fim) continue;
    encontrou = true;
    meta += metaDia.meta;
    metaLucro += metaDia.metaLucro;
  }
  return encontrou ? { meta, metaLucro } : null;
}

/**
 * Fração da meta mensal que cabe em `p` dentro do mês, pelos dias corridos:
 * meta mensal ÷ dias do mês × dias do intervalo, como o BI antigo
 * (`MetasRealizadoNeedleRepository`). Pendência P33.
 */
function fracaoDoMes(mes: string, periodo: Periodo): number {
  const mesInteiro = { inicio: `${mes}-01`, fim: lastDayOfMonth(`${mes}-01`) };
  const parte = intersecao(mesInteiro, periodo);
  return parte ? dias(parte) / daysInMonth(mesInteiro.inicio) : 0;
}

/**
 * Meta de um nível (departamento, grupo, subgrupo) em um período qualquer, a partir
 * das metas mensais (P33). null quando nenhum mês do período tem meta do código.
 */
export function metaNivelNoPeriodo(
  mensais: MetaMensal[],
  periodo: Periodo | null,
): { meta: number; metaLucro: number } | null {
  if (!periodo) return null;
  const meses = new Set(mesesDoPeriodo(periodo));
  let meta = 0;
  let metaLucro = 0;
  let encontrou = false;
  for (const metaMensal of mensais) {
    if (!meses.has(metaMensal.mes)) continue;
    encontrou = true;
    const fracao = fracaoDoMes(metaMensal.mes, periodo);
    meta += metaMensal.meta * fracao;
    metaLucro += metaMensal.metaLucro * fracao;
  }
  return encontrou ? { meta, metaLucro } : null;
}

/**
 * Meta diária de um departamento (filtro Departamento): a meta mensal dele
 * dividida igualmente pelos dias do mês (P33).
 */
export function metaDiariaDoNivel(mensais: MetaMensal[]): MetaDia[] {
  const porMes = new Map<string, { meta: number; metaLucro: number }>();
  for (const metaMensal of mensais) {
    const atual = porMes.get(metaMensal.mes) ?? { meta: 0, metaLucro: 0 };
    porMes.set(metaMensal.mes, { meta: atual.meta + metaMensal.meta, metaLucro: atual.metaLucro + metaMensal.metaLucro });
  }
  const resultado: MetaDia[] = [];
  for (const [mes, total] of porMes) {
    const qtd = daysInMonth(`${mes}-01`);
    for (let dia = 1; dia <= qtd; dia++) {
      resultado.push({
        data: `${mes}-${String(dia).padStart(2, "0")}`,
        meta: total.meta / qtd,
        metaLucro: total.metaLucro / qtd,
      });
    }
  }
  return resultado.sort((primeiro, segundo) => primeiro.data.localeCompare(segundo.data));
}
