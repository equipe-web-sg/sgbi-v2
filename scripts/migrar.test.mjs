import { describe, expect, it } from "vitest";
import { erroIgnoravel, executar, migracoesPendentes, validarMigracoes } from "./migrar.mjs";
import { migrations } from "./migracoes.mjs";

/** Conexão de mentira: guarda o que foi executado e responde o último id registrado. */
function conexaoFalsa({ ultimoId = null, falhaEm = {} } = {}) {
  const executadas = [];
  return {
    executadas,
    query: async (sql, valores) => {
      executadas.push({ sql, valores });
      if (/SELECT max\(id\)/.test(sql)) return [[{ ultimoId }]];
      if (falhaEm[sql]) throw Object.assign(new Error("falha"), { code: falhaEm[sql] });
      return [[]];
    },
    registradas: () => executadas.filter((e) => /^INSERT INTO migrations/.test(e.sql)).map((e) => e.valores[0]),
  };
}
const semLog = () => {};

describe("migrations (cópia do BI antigo)", () => {
  it("a lista é válida: ids de 1 a N, sem buracos, cada uma com queries", () => {
    expect(() => validarMigracoes(migrations)).not.toThrow();
    expect(migrations[0].id).toBe(1);
  });

  it("recusa id repetido, buraco ou migration sem query", () => {
    expect(() => validarMigracoes([{ id: 1, queries: ["a"] }, { id: 1, queries: ["b"] }])).toThrow(/fora de ordem/);
    expect(() => validarMigracoes([{ id: 1, queries: ["a"] }, { id: 3, queries: ["b"] }])).toThrow(/fora de ordem/);
    expect(() => validarMigracoes([{ id: 1, queries: [] }])).toThrow(/sem queries/);
  });
});

describe("migracoesPendentes", () => {
  const lista = [1, 2, 3, 4, 5].map((id) => ({ id, queries: ["x"] }));

  it("banco sem nenhuma (null ou 0) aplica todas", () => {
    expect(migracoesPendentes(lista, null).map((m) => m.id)).toEqual([1, 2, 3, 4, 5]);
    expect(migracoesPendentes(lista, 0)).toHaveLength(5);
  });

  it("só as de id maior que o último registrado", () => {
    expect(migracoesPendentes(lista, 3).map((m) => m.id)).toEqual([4, 5]);
  });

  it("banco em dia, ou à frente (o outro BI já aplicou), não aplica nada", () => {
    expect(migracoesPendentes(lista, 5)).toEqual([]);
    expect(migracoesPendentes(lista, 9)).toEqual([]);
  });
});

describe("erroIgnoravel", () => {
  it("ignora só os erros de 'já existe', como o antigo", () => {
    for (const codigo of ["ER_DUP_KEYNAME", "ER_DUP_KEY", "ER_DUP_ENTRY", "ER_DUP_FIELDNAME", "ER_TABLE_EXISTS_ERROR", "ER_FK_DUP_NAME"]) {
      expect(erroIgnoravel(codigo)).toBe(true);
    }
    expect(erroIgnoravel("ER_PARSE_ERROR")).toBe(false);
    expect(erroIgnoravel("ER_ACCESS_DENIED_ERROR")).toBe(false);
    expect(erroIgnoravel(undefined)).toBe(false);
  });
});

describe("executar", () => {
  it("cliente novo (do zero): aplica todas, na ordem, e registra cada uma", async () => {
    const conexao = conexaoFalsa({ ultimoId: null });
    const resultado = await executar(conexao, migrations, semLog);
    expect(resultado.aplicadas).toEqual(migrations.map((m) => m.id));
    expect(conexao.registradas()).toEqual(migrations.map((m) => m.id));
    expect(conexao.executadas[0].sql).toMatch(/CREATE TABLE IF NOT EXISTS migrations/);
  });

  it("cliente que veio do BI antigo (já no último id): não executa nenhuma migration", async () => {
    const conexao = conexaoFalsa({ ultimoId: migrations.at(-1).id });
    const resultado = await executar(conexao, migrations, semLog);
    expect(resultado.aplicadas).toEqual([]);
    expect(conexao.registradas()).toEqual([]);
    // só criou a tabela de controle (se faltasse) e leu o último id
    expect(conexao.executadas).toHaveLength(2);
  });

  it("cliente do antigo em versão velha: aplica só o que falta", async () => {
    const conexao = conexaoFalsa({ ultimoId: 38 });
    const resultado = await executar(conexao, migrations, semLog);
    expect(resultado.aplicadas).toEqual([39, 40, 41]);
    expect(conexao.registradas()).toEqual([39, 40, 41]);
  });

  it("a segunda subida não repete nada", async () => {
    const primeira = conexaoFalsa({ ultimoId: null });
    const { ultimoId } = await executar(primeira, migrations, semLog);
    const segunda = conexaoFalsa({ ultimoId });
    expect((await executar(segunda, migrations, semLog)).aplicadas).toEqual([]);
  });

  it("erro de 'já existe' é ignorado e a migration é registrada", async () => {
    const lista = [{ id: 1, queries: ["CREATE TABLE a", "ALTER TABLE a ADD b"] }];
    const conexao = conexaoFalsa({ falhaEm: { "CREATE TABLE a": "ER_TABLE_EXISTS_ERROR" } });
    const resultado = await executar(conexao, lista, semLog);
    expect(resultado.aplicadas).toEqual([1]);
    expect(conexao.executadas.some((e) => e.sql === "ALTER TABLE a ADD b")).toBe(true);
  });

  it("erro de verdade interrompe, e a migration que falhou não é registrada (tenta de novo na próxima subida)", async () => {
    const lista = [
      { id: 1, queries: ["ok"] },
      { id: 2, queries: ["quebrada"] },
      { id: 3, queries: ["nunca"] },
    ];
    const conexao = conexaoFalsa({ falhaEm: { quebrada: "ER_PARSE_ERROR" } });
    await expect(executar(conexao, lista, semLog)).rejects.toThrow("falha");
    expect(conexao.registradas()).toEqual([1]);
    expect(conexao.executadas.some((e) => e.sql === "nunca")).toBe(false);
  });
});
