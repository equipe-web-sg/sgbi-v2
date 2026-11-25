import { describe, expect, it } from "vitest";
import { calcularDesempenho, combinarSeries, indicadores, serieDiaria } from "./compute";
import type { DiaVendas, LinhaCuponsNivel } from "./types";

const dia = (data: string, parcial: Partial<DiaVendas> = {}): DiaVendas => ({
  data,
  venda: null,
  custo: null,
  vendaPdv: null,
  cupons: null,
  itens: null,
  ...parcial,
});

describe("combinarSeries", () => {
  it("preenche todos os dias e junta as fontes (vendas + cupons)", () => {
    const resultado = combinarSeries({ inicio: "2026-11-01", fim: "2026-11-02" }, { inicio: "2026-10-30", fim: "2026-10-31" }, [
      { atual: [{ data: "2026-11-01", venda: 500, custo: 300 }], anterior: [] },
      { atual: [{ data: "2026-11-01", cupons: 25, itens: 100, vendaPdv: 450 }], anterior: [] },
    ]);
    expect(resultado.atual.dias).toHaveLength(2);
    expect(resultado.atual.dias[0]).toMatchObject({ venda: 500, custo: 300, cupons: 25, itens: 100, vendaPdv: 450 });
    expect(resultado.atual.dias[1].venda).toBeNull();
    expect(resultado.anterior.dias.map((diaVendas) => diaVendas.data)).toEqual(["2026-10-30", "2026-10-31"]);
  });
});

describe("indicadores de vendas", () => {
  const dias = [
    dia("d1", { venda: 1000, custo: 750, vendaPdv: 900, cupons: 30, itens: 90 }),
    dia("d2", { venda: 1000, custo: 750, vendaPdv: 1100, cupons: 70, itens: 310 }),
  ];

  it("lucro, margem, ticket médio e itens por cupom", () => {
    const indicadoresVendas = indicadores(dias);
    expect(indicadoresVendas.lucro).toBe(500);
    expect(indicadoresVendas.margem).toBe(25);
    expect(indicadoresVendas.ticketMedio).toBe(20); // 2000 PDV ÷ 100 cupons
    expect(indicadoresVendas.itensPorCupom).toBe(4); // 400 ÷ 100
  });

  it("sem cupons carregados, ticket e itens por cupom ficam null (não 0)", () => {
    const indicadoresVendas = indicadores([dia("d1", { venda: 100, custo: 50 })]);
    expect(indicadoresVendas.ticketMedio).toBeNull();
    expect(indicadoresVendas.itensPorCupom).toBeNull();
    expect(indicadoresVendas.cobertura.cupons).toBe(0);
  });

  it("sem venda, a margem é null", () => {
    expect(indicadores([dia("d1")]).margem).toBeNull();
  });

  it("serieDiaria deixa null os dias sem a base", () => {
    const serie = serieDiaria([dia("d1", { venda: 100, custo: 60 }), dia("d2")], (indicadoresVendas) => indicadoresVendas.margem, "venda");
    expect(serie[0].valor).toBeCloseTo(40);
    expect(serie[1].valor).toBeNull();
  });
});

describe("calcularDesempenho", () => {
  const linha = {
    codigo: 1,
    descricao: "Bebidas",
    pai: null,
    venda: 1000,
    custo: 800,
    vendaAnterior: 800,
    custoAnterior: 560,
  };
  const cupons: LinhaCuponsNivel = { codigo: 1, cupons: 100, itens: 400, cuponsAnterior: 80, itensAnterior: 240 };

  it("calcula venda, lucro, margem, variações e participação", () => {
    const resultado = calcularDesempenho(linha, cupons, 5000);
    expect(resultado.lucro).toBe(200);
    expect(resultado.margem).toBe(20);
    expect(resultado.variacaoVenda).toBe(25);
    expect(resultado.variacaoLucro).toBeCloseTo(-16.666, 2); // 200 contra 240
    expect(resultado.variacaoMargemPp).toBeCloseTo(-10); // 20% contra 30%
    expect(resultado.participacao).toBe(20);
  });

  it("cupons e itens por cupom, com variação contra o período anterior", () => {
    const resultado = calcularDesempenho(linha, cupons, 5000);
    expect(resultado.cupons).toBe(100);
    expect(resultado.variacaoCupons).toBe(25);
    expect(resultado.itensPorCupom).toBe(4);
    expect(resultado.variacaoItensPorCupom).toBeCloseTo(33.333, 2); // 4 contra 3
  });

  it("cupons ainda carregando (undefined) é diferente de sem cupons (null)", () => {
    const carregando = calcularDesempenho(linha, undefined, 5000);
    expect(carregando.cupons).toBeUndefined();
    expect(carregando.variacaoCupons).toBeUndefined();
    expect(carregando.itensPorCupom).toBeUndefined();

    const semCupons = calcularDesempenho(linha, null, 5000);
    expect(semCupons.cupons).toBeNull();
    expect(semCupons.variacaoCupons).toBeNull();
    expect(semCupons.itensPorCupom).toBeNull();
  });

  it("sem venda anterior ou venda total zero, as razões são null", () => {
    const resultado = calcularDesempenho({ ...linha, vendaAnterior: 0, custoAnterior: 0 }, cupons, 0);
    expect(resultado.variacaoVenda).toBeNull();
    expect(resultado.variacaoMargemPp).toBeNull();
    expect(resultado.participacao).toBeNull();
  });
});
