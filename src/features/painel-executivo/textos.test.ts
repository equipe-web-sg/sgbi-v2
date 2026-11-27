import { describe, expect, it } from "vitest";
import { calcularLinha } from "./compute";
import { explicarSituacao } from "./textos";

const linha = (compra: number, compraAnterior: number) =>
  calcularLinha({ codigo: 1, descricao: "X", compra, venda: 100, compraAnterior, vendaAnterior: 100 });

describe("explicarSituacao", () => {
  it("explica o critério de cada situação com os limites da configuração", () => {
    expect(explicarSituacao(linha(51, 50))[0]).toMatch(/^Bom: .*até 2,00 p\.p\./);
    expect(explicarSituacao(linha(54, 50))[0]).toMatch(/^Atenção: .*2,00 p\.p\. e vai até 6,00 p\.p\./);
    expect(explicarSituacao(linha(60, 50))[0]).toMatch(/^Crítico: .*passa de 6,00 p\.p\./);
  });

  it("mostra os dois percentuais e a variação da linha", () => {
    expect(explicarSituacao(linha(54, 50))[1]).toBe(
      "Compra sobre venda: 54,00% contra 50,00% no período de comparação (+4,00 p.p.).",
    );
  });

  it("sem comparação não há situação", () => {
    const semAnterior = calcularLinha({ codigo: 1, descricao: "X", compra: 10, venda: 100, compraAnterior: 0, vendaAnterior: 0 });
    expect(explicarSituacao(semAnterior)).toEqual(["Sem situação: não há compra e venda nos dois períodos para comparar."]);
  });
});
