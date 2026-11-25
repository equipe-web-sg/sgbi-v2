import { describe, expect, it } from "vitest";
import {
  alertas,
  calcularLinha,
  combinarSeries,
  indicadores,
  margemDoIntervalo,
  serieDiaria,
  situacao,
  totais,
  vendaDoIntervalo,
} from "./compute";
import type { Dia, LinhaNivel } from "./types";

const dia = (data: string, parcial: Partial<Dia> = {}): Dia => ({
  data,
  venda: null,
  custo: null,
  compra: null,
  vendaPdv: null,
  tickets: null,
  cancelamentos: null,
  despesas: null,
  ...parcial,
});

describe("combinarSeries", () => {
  const periodo = { inicio: "2026-11-01", fim: "2026-11-03" };
  const anterior = { inicio: "2026-10-29", fim: "2026-10-31" };

  it("gera um dia para cada data do período, com null onde não há carga", () => {
    const resultado = combinarSeries(periodo, anterior, [{ atual: [{ data: "2026-11-02", venda: 10 }], anterior: [] }]);
    expect(resultado.atual.dias.map((registro) => registro.data)).toEqual(["2026-11-01", "2026-11-02", "2026-11-03"]);
    expect(resultado.atual.dias[0].venda).toBeNull();
    expect(resultado.atual.dias[1].venda).toBe(10);
    expect(resultado.anterior.dias).toHaveLength(3);
  });

  it("junta fontes diferentes no mesmo dia", () => {
    const resultado = combinarSeries(periodo, anterior, [
      { atual: [{ data: "2026-11-01", venda: 100, custo: 60 }], anterior: [] },
      { atual: [{ data: "2026-11-01", tickets: 5, vendaPdv: 90 }], anterior: [] },
    ]);
    expect(resultado.atual.dias[0]).toMatchObject({ venda: 100, custo: 60, tickets: 5, vendaPdv: 90 });
  });

  it("fontes ainda não carregadas (undefined) deixam os campos null", () => {
    const resultado = combinarSeries(periodo, anterior, [undefined, undefined]);
    expect(resultado.atual.dias.every((registro) => registro.venda === null && registro.tickets === null)).toBe(true);
  });

  it("zero vindo da fonte é diferente de sem carga", () => {
    const resultado = combinarSeries(periodo, anterior, [{ atual: [{ data: "2026-11-01", venda: 0 }], anterior: [] }]);
    expect(resultado.atual.dias[0].venda).toBe(0);
  });
});

describe("totais", () => {
  it("soma só os dias com carga e conta a cobertura de cada campo", () => {
    const totalGeral = totais([dia("d1", { venda: 100 }), dia("d2"), dia("d3", { venda: 50, custo: 30 })]);
    expect(totalGeral.venda).toBe(150);
    expect(totalGeral.cobertura.venda).toBe(2);
    expect(totalGeral.custo).toBe(30);
    expect(totalGeral.cobertura.custo).toBe(1);
    expect(totalGeral.cobertura.despesas).toBe(0);
  });
});

describe("indicadores", () => {
  const dias = [
    dia("d1", { venda: 1000, custo: 700, compra: 400, vendaPdv: 800, tickets: 40, cancelamentos: 16, despesas: 100 }),
    dia("d2", { venda: 1000, custo: 800, compra: 600, vendaPdv: 1200, tickets: 60, cancelamentos: 24, despesas: 100 }),
  ];

  it("calcula lucro, margem, resultado e relações sobre a venda", () => {
    const indicadoresDoPeriodo = indicadores(dias);
    expect(indicadoresDoPeriodo.venda).toBe(2000);
    expect(indicadoresDoPeriodo.lucro).toBe(500);
    expect(indicadoresDoPeriodo.margem).toBe(25);
    expect(indicadoresDoPeriodo.compraSobreVenda).toBe(50);
    expect(indicadoresDoPeriodo.despesasSobreVenda).toBe(10);
    expect(indicadoresDoPeriodo.resultado).toBe(300);
    expect(indicadoresDoPeriodo.resultadoSobreVenda).toBe(15);
  });

  it("ticket médio e cancelamentos usam a base PDV, não a venda total", () => {
    const indicadoresDoPeriodo = indicadores(dias);
    expect(indicadoresDoPeriodo.ticketMedio).toBe(20); // 2000 de vendaPdv ÷ 100 tickets
    expect(indicadoresDoPeriodo.cancelamentosSobreVenda).toBe(2); // 40 ÷ 2000 vendaPdv
  });

  it("sem venda: margem e razões ficam null (nunca NaN ou Infinity)", () => {
    const indicadoresDoPeriodo = indicadores([dia("d1"), dia("d2")]);
    expect(indicadoresDoPeriodo.venda).toBe(0);
    expect(indicadoresDoPeriodo.margem).toBeNull();
    expect(indicadoresDoPeriodo.compraSobreVenda).toBeNull();
    expect(indicadoresDoPeriodo.ticketMedio).toBeNull();
    expect(indicadoresDoPeriodo.cancelamentosSobreVenda).toBeNull();
    expect(indicadoresDoPeriodo.despesasSobreVenda).toBeNull();
    expect(indicadoresDoPeriodo.cobertura.venda).toBe(0);
  });

  it("lista vazia não quebra", () => {
    expect(indicadores([]).venda).toBe(0);
  });
});

describe("serieDiaria e medidas do intervalo", () => {
  const dias = [dia("d1", { venda: 100, custo: 80 }), dia("d2"), dia("d3", { venda: 200, custo: 100 })];

  it("dia sem a base do indicador fica null (sparkline com buraco)", () => {
    const serie = serieDiaria(dias, (indicador) => indicador.margem, "venda");
    expect(serie).toEqual([
      { data: "d1", valor: 20 },
      { data: "d2", valor: null },
      { data: "d3", valor: 50 },
    ]);
  });

  it("vendaDoIntervalo e margemDoIntervalo: null sem nenhum dia com venda", () => {
    expect(vendaDoIntervalo(dias)).toBe(300);
    expect(margemDoIntervalo(dias)).toBeCloseTo(40);
    expect(vendaDoIntervalo([dia("d1")])).toBeNull();
    expect(margemDoIntervalo([dia("d1")])).toBeNull();
  });
});

describe("situacao (limites provisórios: bom até 2 p.p., atenção até 6 p.p.)", () => {
  it.each([
    [null, null],
    [0, "bom"],
    [2, "bom"],
    [2.01, "atencao"],
    [6, "atencao"],
    [6.01, "critico"],
    [-2, "bom"],
    [-6, "atencao"],
    [-6.01, "critico"],
  ])("variação %s p.p. → %s", (pp, esperado) => {
    expect(situacao(pp)).toBe(esperado);
  });
});

describe("calcularLinha", () => {
  const linha: LinhaNivel = {
    codigo: 1,
    descricao: "Mercearia",
    compra: 50,
    venda: 100,
    compraAnterior: 10,
    vendaAnterior: 100,
  };

  it("calcula compra sobre venda, variações e situação", () => {
    const resultado = calcularLinha(linha);
    expect(resultado.compraSobreVenda).toBe(50);
    expect(resultado.compraSobreVendaAnterior).toBe(10);
    expect(resultado.variacaoPp).toBe(40);
    expect(resultado.variacaoCompra).toBe(400);
    expect(resultado.variacaoVenda).toBe(0);
    expect(resultado.situacao).toBe("critico");
  });

  it("sem venda no período anterior não há comparação nem situação", () => {
    const resultado = calcularLinha({ ...linha, vendaAnterior: 0, compraAnterior: 0 });
    expect(resultado.compraSobreVendaAnterior).toBeNull();
    expect(resultado.variacaoPp).toBeNull();
    expect(resultado.situacao).toBeNull();
  });
});

describe("alertas", () => {
  const base = [dia("d1", { venda: 1000, custo: 700, vendaPdv: 1000, cancelamentos: 100, despesas: 100 })];
  const sem = calcularLinha({ codigo: 9, descricao: "Estável", compra: 10, venda: 100, compraAnterior: 10, vendaAnterior: 100 });

  it("períodos iguais não geram alerta", () => {
    expect(alertas(indicadores(base), indicadores(base), [sem])).toEqual([]);
  });

  it("queda de margem de 0,5 p.p. ou mais gera alerta", () => {
    const pior = [dia("d1", { ...base[0], custo: 800 })]; // 20% contra 30%
    const resultado = alertas(indicadores(pior), indicadores(base), []);
    expect(resultado.map((alerta) => alerta.id)).toContain("margem");
  });

  it("queda de margem menor que 0,5 p.p. não gera alerta", () => {
    const quase = [dia("d1", { ...base[0], custo: 703 })]; // 29,7% contra 30%
    expect(alertas(indicadores(quase), indicadores(base), []).map((alerta) => alerta.id)).not.toContain("margem");
  });

  it("aumento das despesas sobre a venda gera alerta, só se os dois períodos têm despesa carregada", () => {
    const mais = [dia("d1", { ...base[0], despesas: 200 })];
    expect(alertas(indicadores(mais), indicadores(base), []).map((alerta) => alerta.id)).toContain("despesas");

    const semCarga = [dia("d1", { ...base[0], despesas: null })];
    expect(alertas(indicadores(mais), indicadores(semCarga), []).map((alerta) => alerta.id)).not.toContain("despesas");
  });

  it("cancelamentos 10% maiores geram alerta; 9% não", () => {
    const dez = [dia("d1", { ...base[0], cancelamentos: 110 })];
    const nove = [dia("d1", { ...base[0], cancelamentos: 109 })];
    expect(alertas(indicadores(dez), indicadores(base), []).map((alerta) => alerta.id)).toContain("cancelamentos");
    expect(alertas(indicadores(nove), indicadores(base), []).map((alerta) => alerta.id)).not.toContain("cancelamentos");
  });

  it("departamento crítico gera alerta; o sentido (sobe ou cai) define o tipo", () => {
    const sobe = calcularLinha({ codigo: 1, descricao: "A", compra: 50, venda: 100, compraAnterior: 10, vendaAnterior: 100 });
    const cai = calcularLinha({ codigo: 2, descricao: "B", compra: 10, venda: 100, compraAnterior: 50, vendaAnterior: 100 });
    const resultado = alertas(indicadores(base), indicadores(base), [sobe, cai, sem]);
    expect(resultado).toHaveLength(2);
    expect(resultado.find((alerta) => alerta.id === "departamento-1")?.tipo).toBe("compra-alta");
    expect(resultado.find((alerta) => alerta.id === "departamento-2")?.tipo).toBe("compra-baixa");
  });
});
