import { describe, expect, it } from "vitest";
import { evolucaoComparativa } from "./serie";

type Dia = { data: string; valor: number | null };
const soma = (dias: Dia[]) => dias.reduce((acumulado, dia) => acumulado + (dia.valor ?? 0), 0);

describe("evolucaoComparativa", () => {
  const atual: Dia[] = [
    { data: "2026-11-02", valor: 10 },
    { data: "2026-11-03", valor: 20 },
    { data: "2026-11-09", valor: 5 },
  ];
  const anterior: Dia[] = [
    { data: "2026-10-26", valor: 1 },
    { data: "2026-10-27", valor: 2 },
    { data: "2026-11-02", valor: 4 },
  ];

  it("por dia, alinha atual e anterior pela posição", () => {
    const resultado = evolucaoComparativa(atual, anterior, "dia", soma);
    expect(resultado).toHaveLength(3);
    expect(resultado[0]).toEqual({
      chave: "2026-11-02",
      dataAtual: "2026-11-02",
      dataAnterior: "2026-10-26",
      atual: 10,
      anterior: 1,
    });
  });

  it("por semana, soma os dias de cada semana (segunda a domingo)", () => {
    const resultado = evolucaoComparativa(atual, anterior, "semana", soma);
    expect(resultado.map((pontoComparativo) => pontoComparativo.atual)).toEqual([30, 5]);
    expect(resultado.map((pontoComparativo) => pontoComparativo.anterior)).toEqual([3, 4]);
  });

  it("por mês, agrupa por YYYY-MM (o anterior cobre out e nov; o atual só nov)", () => {
    const resultado = evolucaoComparativa(atual, anterior, "mes", soma);
    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toMatchObject({ chave: "2026-11-02", atual: 35, anterior: 3 });
    expect(resultado[1]).toMatchObject({ atual: null, anterior: 4, dataAtual: null });
  });

  it("quando um lado é mais longo, o outro fica null", () => {
    const resultado = evolucaoComparativa(atual, anterior.slice(0, 1), "dia", soma);
    expect(resultado[1].anterior).toBeNull();
    expect(resultado[1].dataAnterior).toBeNull();
    expect(resultado[2].atual).toBe(5);

    const inverso = evolucaoComparativa(atual.slice(0, 1), anterior, "dia", soma);
    expect(inverso[2].atual).toBeNull();
    expect(inverso[2].chave).toBe("2026-11-02"); // chave cai para a data do anterior
  });

  it("repassa o null da medida (sem carga)", () => {
    const resultado = evolucaoComparativa([{ data: "2026-11-02", valor: null }], [], "dia", () => null);
    expect(resultado[0].atual).toBeNull();
  });
});
