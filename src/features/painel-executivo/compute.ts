import { diferencaPp, percentual, variacao } from "@/lib/calc";
import { PAINEL_CONFIG } from "./config";
import { eachDay } from "@/lib/date";
import { formatDecimal, formatMoeda } from "@/lib/format";
import type { Dia, LinhaNivel, Periodo, PontoSerie, ResumoResponse, SerieResponse } from "./types";

type Campo = Exclude<keyof Dia, "data">;

function preencher(periodo: Periodo, series: (PontoSerie[] | undefined)[]): Dia[] {
  const porDia = new Map<string, PontoSerie>();
  for (const serie of series) {
    for (const ponto of serie ?? []) porDia.set(ponto.data, { ...porDia.get(ponto.data), ...ponto });
  }
  return eachDay(periodo).map((data) => {
    const registro = porDia.get(data);
    return {
      data,
      venda: registro?.venda ?? null,
      custo: registro?.custo ?? null,
      compra: registro?.compra ?? null,
      vendaPdv: registro?.vendaPdv ?? null,
      tickets: registro?.tickets ?? null,
      cancelamentos: registro?.cancelamentos ?? null,
      despesas: registro?.despesas ?? null,
    };
  });
}

/** Combina as fontes já carregadas; campos de fontes pendentes ficam null. */
export function combinarSeries(
  periodo: Periodo,
  periodoAnterior: Periodo,
  series: (SerieResponse | undefined)[],
): ResumoResponse {
  return {
    atual: { periodo, dias: preencher(periodo, series.map((serie) => serie?.atual)) },
    anterior: { periodo: periodoAnterior, dias: preencher(periodoAnterior, series.map((serie) => serie?.anterior)) },
  };
}

export type Totais = Record<Campo, number> & {
  /** Dias com carga para cada campo; 0 = sem dados no período. */
  cobertura: Record<Campo, number>;
};

const CAMPOS: Campo[] = [
  "venda",
  "custo",
  "compra",
  "vendaPdv",
  "tickets",
  "cancelamentos",
  "despesas",
];

export function totais(dias: Dia[]): Totais {
  const result = { cobertura: {} } as Totais;
  for (const campo of CAMPOS) {
    let total = 0;
    let cobertura = 0;
    for (const dia of dias) {
      const valor = dia[campo];
      if (valor != null) {
        total += valor;
        cobertura++;
      }
    }
    result[campo] = total;
    result.cobertura[campo] = cobertura;
  }
  return result;
}

export { diferencaPp, percentual, variacao };

export type Indicadores = {
  venda: number;
  lucro: number;
  margem: number | null;
  compra: number;
  compraSobreVenda: number | null;
  vendaPdv: number;
  tickets: number;
  ticketMedio: number | null;
  cancelamentos: number;
  cancelamentosSobreVenda: number | null;
  despesas: number;
  despesasSobreVenda: number | null;
  resultado: number;
  resultadoSobreVenda: number | null;
  cobertura: Totais["cobertura"];
};

export function indicadores(dias: Dia[]): Indicadores {
  const totalGeral = totais(dias);
  const lucro = totalGeral.venda - totalGeral.custo;
  const resultado = lucro - totalGeral.despesas;
  return {
    venda: totalGeral.venda,
    lucro,
    margem: percentual(lucro, totalGeral.venda),
    compra: totalGeral.compra,
    compraSobreVenda: percentual(totalGeral.compra, totalGeral.venda),
    vendaPdv: totalGeral.vendaPdv,
    tickets: totalGeral.tickets,
    ticketMedio: totalGeral.tickets ? totalGeral.vendaPdv / totalGeral.tickets : null,
    cancelamentos: totalGeral.cancelamentos,
    // Cancelamentos são do PDV: base = venda PDV.
    cancelamentosSobreVenda: percentual(totalGeral.cancelamentos, totalGeral.vendaPdv),
    despesas: totalGeral.despesas,
    despesasSobreVenda: percentual(totalGeral.despesas, totalGeral.venda),
    resultado,
    resultadoSobreVenda: percentual(resultado, totalGeral.venda),
    cobertura: totalGeral.cobertura,
  };
}

/** Série diária de um indicador para os sparklines (null = sem carga). */
export function serieDiaria(
  dias: Dia[],
  fn: (indicador: Indicadores) => number | null,
  campoBase: Campo,
): { data: string; valor: number | null }[] {
  return dias.map((dia) => ({
    data: dia.data,
    valor: dia[campoBase] == null ? null : fn(indicadores([dia])),
  }));
}

/** Medidas do gráfico de evolução: null quando nenhum dia do intervalo tem venda carregada. */
export function vendaDoIntervalo(dias: Dia[]): number | null {
  const totalGeral = totais(dias);
  return totalGeral.cobertura.venda ? totalGeral.venda : null;
}

export function margemDoIntervalo(dias: Dia[]): number | null {
  const totalGeral = totais(dias);
  return totalGeral.cobertura.venda ? percentual(totalGeral.venda - totalGeral.custo, totalGeral.venda) : null;
}

export type Situacao = "bom" | "atencao" | "critico";

/** Pela variação absoluta, em p.p., da compra sobre venda (config.ts). */
export function situacao(variacaoPp: number | null): Situacao | null {
  if (variacaoPp == null) return null;
  const { bomAtePp, atencaoAtePp } = PAINEL_CONFIG.situacao;
  const abs = Math.abs(variacaoPp);
  if (abs <= bomAtePp) return "bom";
  if (abs <= atencaoAtePp) return "atencao";
  return "critico";
}

export type LinhaCalculada = LinhaNivel & {
  variacaoCompra: number | null;
  variacaoVenda: number | null;
  compraSobreVenda: number | null;
  compraSobreVendaAnterior: number | null;
  variacaoPp: number | null;
  situacao: Situacao | null;
};

export function calcularLinha(linha: LinhaNivel): LinhaCalculada {
  const compraSobreVenda = percentual(linha.compra, linha.venda);
  const compraSobreVendaAnterior = percentual(linha.compraAnterior, linha.vendaAnterior);
  const variacaoPp = diferencaPp(compraSobreVenda, compraSobreVendaAnterior);
  return {
    ...linha,
    variacaoCompra: variacao(linha.compra, linha.compraAnterior),
    variacaoVenda: variacao(linha.venda, linha.vendaAnterior),
    compraSobreVenda,
    compraSobreVendaAnterior,
    variacaoPp,
    situacao: situacao(variacaoPp),
  };
}

export type Alerta = {
  id: string;
  tipo: "compra-alta" | "compra-baixa" | "margem" | "despesa" | "cancelamento" | "desconto";
  titulo: string;
  detalhe: string;
};

export function alertas(
  atual: Indicadores,
  anterior: Indicadores,
  departamentos: LinhaCalculada[],
): Alerta[] {
  const regras = PAINEL_CONFIG.alertas;
  const lista: Alerta[] = [];

  if (regras.departamentoCritico) {
    for (const linhaCalculada of departamentos) {
      if (linhaCalculada.situacao !== "critico" || linhaCalculada.variacaoPp == null) continue;
      lista.push({
        id: `departamento-${linhaCalculada.codigo}`,
        tipo: linhaCalculada.variacaoPp > 0 ? "compra-alta" : "compra-baixa",
        titulo: `${linhaCalculada.descricao}: compra sobre venda ${linhaCalculada.variacaoPp > 0 ? "subiu" : "caiu"} ${formatDecimal(Math.abs(linhaCalculada.variacaoPp))} p.p.`,
        detalhe: `${formatDecimal(linhaCalculada.compraSobreVenda ?? 0)}% vs ${formatDecimal(linhaCalculada.compraSobreVendaAnterior ?? 0)}% no período anterior`,
      });
    }
  }

  const margemPp = diferencaPp(atual.margem, anterior.margem);
  if (margemPp != null && margemPp <= -regras.quedaMargemPp) {
    lista.push({
      id: "margem",
      tipo: "margem",
      titulo: `Margem bruta ${formatDecimal(Math.abs(margemPp))} p.p. abaixo do período anterior`,
      detalhe: `${formatDecimal(atual.margem!)}% vs ${formatDecimal(anterior.margem!)}%`,
    });
  }

  if (atual.cobertura.despesas && anterior.cobertura.despesas) {
    const despesaPp = diferencaPp(atual.despesasSobreVenda, anterior.despesasSobreVenda);
    if (despesaPp != null && despesaPp >= regras.aumentoDespesaSobreVendaPp) {
      lista.push({
        id: "despesas",
        tipo: "despesa",
        titulo: `Despesas operacionais ${formatDecimal(despesaPp)} p.p. acima do período anterior`,
        detalhe: `${formatDecimal(atual.despesasSobreVenda!)}% da venda vs ${formatDecimal(anterior.despesasSobreVenda!)}%`,
      });
    }
  }

  if (atual.cobertura.cancelamentos && anterior.cobertura.cancelamentos) {
    const variacaoCancel = variacao(atual.cancelamentos, anterior.cancelamentos);
    if (variacaoCancel != null && variacaoCancel >= regras.aumentoCancelamentosPct) {
      lista.push({
        id: "cancelamentos",
        tipo: "cancelamento",
        titulo: `Cancelamentos aumentaram ${formatDecimal(variacaoCancel)}%`,
        detalhe: `${formatMoeda(atual.cancelamentos)} vs ${formatMoeda(anterior.cancelamentos)} no período anterior`,
      });
    }
  }

  return lista;
}
