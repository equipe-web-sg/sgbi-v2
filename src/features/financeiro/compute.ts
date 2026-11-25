import { addDays, eachDay, startOfWeek } from "@/lib/date";
import type { Movimento, Periodo, TipoMovimento } from "./types";

const no = (periodo: Periodo, data: string) => data >= periodo.inicio && data <= periodo.fim;

/** Entradas e saídas realizadas no período (recebido/pago e cartões liquidados). */
export function realizadoNoPeriodo(movimentos: Movimento[], periodo: Periodo) {
  let entradas = 0;
  let saidas = 0;
  for (const movimento of movimentos) {
    if (movimento.situacao !== "realizado" || !no(periodo, movimento.data)) continue;
    if (movimento.tipo === "entrada") entradas += movimento.valor;
    else saidas += movimento.valor;
  }
  return { entradas, saidas, resultado: entradas - saidas };
}

/** Títulos vencidos em aberto até a referência. */
export function vencidos(movimentos: Movimento[]) {
  let receber = 0;
  let pagar = 0;
  for (const movimento of movimentos) {
    if (movimento.situacao !== "vencido") continue;
    if (movimento.tipo === "entrada") receber += movimento.valor;
    else pagar += movimento.valor;
  }
  return { receber, pagar };
}

export type DiaCaixa = {
  data: string;
  entradas: number;
  saidas: number;
  /** Entradas e saídas previstas (em aberto) do dia. */
  entradasPrevistas: number;
  saidasPrevistas: number;
};

export function porDia(movimentos: Movimento[], periodo: Periodo): DiaCaixa[] {
  const dias = new Map(
    eachDay(periodo).map((data) => [data, { data, entradas: 0, saidas: 0, entradasPrevistas: 0, saidasPrevistas: 0 }]),
  );
  for (const movimento of movimentos) {
    const registroDia = dias.get(movimento.data);
    if (!registroDia || movimento.situacao === "vencido") continue;
    const previsto = movimento.situacao === "previsto";
    if (movimento.tipo === "entrada") registroDia[previsto ? "entradasPrevistas" : "entradas"] += movimento.valor;
    else registroDia[previsto ? "saidasPrevistas" : "saidas"] += movimento.valor;
  }
  return [...dias.values()];
}

export type PontoEvolucaoCaixa = DiaCaixa & {
  /** Resultado acumulado do mês até o dia (realizado). */
  acumulado: number | null;
  /** Resultado acumulado projetado (da referência em diante). */
  projetado: number | null;
};

/** Evolução do mês: barras do dia e resultado acumulado realizado e projetado (P42: sem saldo bancário). */
export function evolucaoDoMes(movimentos: Movimento[], mes: Periodo, referencia: string): PontoEvolucaoCaixa[] {
  let acumulado = 0;
  return porDia(movimentos, mes).map((diaCaixa) => {
    acumulado += diaCaixa.entradas - diaCaixa.saidas + diaCaixa.entradasPrevistas - diaCaixa.saidasPrevistas;
    // A linha projetada começa na referência, para continuar a realizada sem buraco.
    return {
      ...diaCaixa,
      acumulado: diaCaixa.data <= referencia ? acumulado : null,
      projetado: diaCaixa.data >= referencia ? acumulado : null,
    };
  });
}

export type Granularidade = "dia" | "semana" | "mes";

export type LinhaPrevista = {
  chave: string;
  inicio: string;
  fim: string;
  entradas: number;
  saidas: number;
  saldo: number;
  /** Acumulado a partir da referência (sem saldo inicial). */
  acumulado: number;
  status: "ok" | "atencao" | "critico";
};

/**
 * Fluxo previsto dos próximos dias (só títulos em aberto e cartões a liquidar),
 * agrupado por dia, semana ou mês. Status: dia negativo = Atenção; acumulado
 * negativo = Crítico (P46).
 */
export function fluxoPrevisto(
  movimentos: Movimento[],
  referencia: string,
  dias: number,
  granularidade: Granularidade,
): LinhaPrevista[] {
  const periodo = { inicio: addDays(referencia, 1), fim: addDays(referencia, dias) };
  const grupos = new Map<string, LinhaPrevista>();
  for (const diaCaixa of porDia(movimentos, periodo)) {
    const chave =
      granularidade === "semana" ? startOfWeek(diaCaixa.data) : granularidade === "mes" ? diaCaixa.data.slice(0, 7) : diaCaixa.data;
    const linhaPrevista = grupos.get(chave) ?? {
      chave,
      inicio: diaCaixa.data,
      fim: diaCaixa.data,
      entradas: 0,
      saidas: 0,
      saldo: 0,
      acumulado: 0,
      status: "ok" as const,
    };
    linhaPrevista.fim = diaCaixa.data;
    linhaPrevista.entradas += diaCaixa.entradasPrevistas;
    linhaPrevista.saidas += diaCaixa.saidasPrevistas;
    grupos.set(chave, linhaPrevista);
  }
  let acumulado = 0;
  return [...grupos.values()].map((linhaPrevista) => {
    const saldo = linhaPrevista.entradas - linhaPrevista.saidas;
    acumulado += saldo;
    return { ...linhaPrevista, saldo, acumulado, status: acumulado < 0 ? "critico" : saldo < 0 ? "atencao" : "ok" };
  });
}

export type Categoria = { categoria: string; valor: number; participacao: number };

/** Realizado por categoria no período (maiores primeiro; o resto em "Outros"). */
export function porCategoria(movimentos: Movimento[], periodo: Periodo, tipo: TipoMovimento, limite: number) {
  const valores = new Map<string, number>();
  for (const movimento of movimentos) {
    if (movimento.tipo !== tipo || movimento.situacao !== "realizado" || !no(periodo, movimento.data)) continue;
    valores.set(movimento.categoria, (valores.get(movimento.categoria) ?? 0) + movimento.valor);
  }
  const total = [...valores.values()].reduce((soma, valor) => soma + valor, 0);
  const ordenadas = [...valores.entries()].sort((primeiro, segundo) => segundo[1] - primeiro[1]);
  const lista =
    ordenadas.length > limite + 1
      ? [...ordenadas.slice(0, limite), ["Outros", ordenadas.slice(limite).reduce((soma, [, valor]) => soma + valor, 0)] as const]
      : ordenadas;
  return {
    total,
    categorias: lista.map(([categoria, valor]): Categoria => ({
      categoria,
      valor,
      participacao: total ? (valor / total) * 100 : 0,
    })),
  };
}

export type PontoMensal = { mes: string; entradas: number; saidas: number; resultado: number };

/** Entradas e saídas por mês (realizado e em aberto, pela data do movimento). */
export function porMes(movimentos: Movimento[], meses: string[]): PontoMensal[] {
  const mapa = new Map(meses.map((mes) => [mes, { mes, entradas: 0, saidas: 0, resultado: 0 }]));
  for (const movimento of movimentos) {
    const mensal = mapa.get(movimento.data.slice(0, 7));
    if (!mensal) continue;
    if (movimento.tipo === "entrada") mensal.entradas += movimento.valor;
    else mensal.saidas += movimento.valor;
  }
  return [...mapa.values()].map((mensal) => ({ ...mensal, resultado: mensal.entradas - mensal.saidas }));
}
