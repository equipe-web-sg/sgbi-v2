import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  handle,
  oneOf,
  ParamError,
  parseFiliais,
  parseNivel,
  parseOrigem,
  parsePeriodo,
  parsePeriodoComparacao,
} from "./params";
import { usuarioAtual } from "./sessao";

// O `handle()` checa a sessão (cookie da requisição); nos testes, um usuário fixo.
vi.mock("./sessao", () => ({ usuarioAtual: vi.fn() }));
vi.mock("./acesso", () => ({ AcessoNegado: class AcessoNegado extends Error {} }));

const parametros = (texto: string) => new URLSearchParams(texto);

describe("parsePeriodo", () => {
  it("aceita datas ISO válidas", () => {
    expect(parsePeriodo(parametros("inicio=2026-11-01&fim=2026-11-30"))).toEqual({ inicio: "2026-11-01", fim: "2026-11-30" });
  });

  it("aceita um período de um dia só", () => {
    expect(parsePeriodo(parametros("inicio=2026-11-01&fim=2026-11-01"))).toEqual({ inicio: "2026-11-01", fim: "2026-11-01" });
  });

  it.each([
    ["sem parâmetros", ""],
    ["só o início", "inicio=2026-11-01"],
    ["data vazia do VX", "inicio=0000-00-00x&fim=2026-11-01"],
    ["formato errado", "inicio=01/11/2026&fim=30/11/2026"],
    ["início depois do fim", "inicio=2026-11-30&fim=2026-11-01"],
  ])("rejeita: %s", (_, query) => {
    expect(() => parsePeriodo(parametros(query))).toThrow(ParamError);
  });

  it("limita o período a 366 dias (365 passa, 367 não)", () => {
    expect(() => parsePeriodo(parametros("inicio=2026-01-01&fim=2026-12-31"))).not.toThrow(); // 365 dias
    expect(() => parsePeriodo(parametros("inicio=2026-01-01&fim=2027-01-02"))).toThrow(ParamError); // 367 dias
  });

  it("usa chaves próprias para o período de comparação", () => {
    expect(parsePeriodoComparacao(parametros("comparacaoInicio=2026-10-01&comparacaoFim=2026-10-31"))).toEqual({
      inicio: "2026-10-01",
      fim: "2026-10-31",
    });
    expect(() => parsePeriodoComparacao(parametros("inicio=2026-10-01&fim=2026-10-31"))).toThrow(ParamError);
  });
});

describe("parseFiliais", () => {
  it("ordena e remove repetidas (chave de cache estável)", () => {
    expect(parseFiliais(parametros("filiais=7,1,2,1"))).toEqual([1, 2, 7]);
  });

  it("ignora vírgulas sobrando", () => {
    expect(parseFiliais(parametros("filiais=1,,2,"))).toEqual([1, 2]);
  });

  it.each([["ausente", ""], ["vazia", "filiais="], ["não numérica", "filiais=a"], ["zero", "filiais=0"], ["negativa", "filiais=-1"], ["decimal", "filiais=1.5"]])(
    "rejeita filial %s",
    (_, query) => {
      expect(() => parseFiliais(parametros(query))).toThrow(ParamError);
    },
  );
});

describe("origem, nível e oneOf", () => {
  it("origem tem padrão 'todos' e rejeita valores desconhecidos", () => {
    expect(parseOrigem(parametros(""))).toBe("todos");
    expect(parseOrigem(parametros("origem=pdv"))).toBe("pdv");
    expect(() => parseOrigem(parametros("origem=loja"))).toThrow(ParamError);
  });

  it("nível tem padrão 'departamento'", () => {
    expect(parseNivel(parametros(""))).toBe("departamento");
    expect(parseNivel(parametros("nivel=subgrupo"))).toBe("subgrupo");
    expect(() => parseNivel(parametros("nivel=secao"))).toThrow(ParamError);
  });

  it("oneOf lista as opções válidas na mensagem", () => {
    expect(() => oneOf("x", ["a", "b"] as const, "campo")).toThrow(/campo.*a, b/);
    expect(() => oneOf(null, ["a"] as const, "campo")).toThrow(ParamError);
  });
});

describe("handle", () => {
  beforeEach(() => {
    vi.mocked(usuarioAtual).mockResolvedValue({ login: "TESTE", nome: "Teste", admin: false, plataforma: "vx" });
  });

  it("sem sessão responde 401 e não executa a rota", async () => {
    vi.mocked(usuarioAtual).mockResolvedValue(null);
    const fn = vi.fn(async () => ({ ok: true }));
    const resultado = await handle(fn);
    expect(resultado.status).toBe(401);
    expect(fn).not.toHaveBeenCalled();
  });

  it("responde 200 com o JSON do resultado", async () => {
    const resultado = await handle(async () => ({ ok: true }));
    expect(resultado.status).toBe(200);
    expect(await resultado.json()).toEqual({ ok: true });
  });

  it("AcessoNegado vira 403 com a mensagem", async () => {
    const { AcessoNegado } = await import("./acesso");
    const resultado = await handle(async () => {
      throw new AcessoNegado("O Fivewin ainda não envia ao banco do BI: despesas.");
    });
    expect(resultado.status).toBe(403);
    expect(await resultado.json()).toEqual({ error: "O Fivewin ainda não envia ao banco do BI: despesas." });
  });

  it("ParamError vira 400 com a mensagem", async () => {
    const resultado = await handle(async () => {
      throw new ParamError("filial inválida");
    });
    expect(resultado.status).toBe(400);
    expect(await resultado.json()).toEqual({ error: "filial inválida" });
  });

  it("erro inesperado vira 500 sem vazar detalhes", async () => {
    const original = console.error;
    console.error = () => {};
    try {
      const resultado = await handle(async () => {
        throw new Error("senha do banco: 1234");
      });
      expect(resultado.status).toBe(500);
      const corpo = JSON.stringify(await resultado.json());
      expect(corpo).not.toContain("1234");
    } finally {
      console.error = original;
    }
  });
});
