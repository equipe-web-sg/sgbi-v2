import { describe, expect, it } from "vitest";
import { origemDoNavegador } from "./origem";

const cabecalhos = (valores: Record<string, string>) => ({
  get: (nome: string) => valores[nome.toLowerCase()] ?? null,
});
const padrao = { host: "0.0.0.0:3000", protocolo: "http:" };

describe("origemDoNavegador", () => {
  it("usa o host que o navegador digitou (porta publicada do Docker), não o de bind", () => {
    expect(origemDoNavegador(cabecalhos({ host: "192.168.0.10:9000" }), padrao)).toBe("http://192.168.0.10:9000");
  });

  it("atrás de proxy reverso usa X-Forwarded-Host e X-Forwarded-Proto", () => {
    const cabecalhosDaRequisicao = cabecalhos({ host: "interno:3000", "x-forwarded-host": "bi.cliente.com.br", "x-forwarded-proto": "https" });
    expect(origemDoNavegador(cabecalhosDaRequisicao, padrao)).toBe("https://bi.cliente.com.br");
  });

  it("com vários proxies encadeados usa o primeiro valor", () => {
    const cabecalhosDaRequisicao = cabecalhos({ "x-forwarded-host": "bi.cliente.com.br, proxy2", "x-forwarded-proto": "https, http" });
    expect(origemDoNavegador(cabecalhosDaRequisicao, padrao)).toBe("https://bi.cliente.com.br");
  });

  it("sem cabeçalhos cai no endereço do próprio servidor", () => {
    expect(origemDoNavegador(cabecalhos({}), padrao)).toBe("http://0.0.0.0:3000");
  });
});
