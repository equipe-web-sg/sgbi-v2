import type { Fonte } from "@/lib/acesso";
import type { Layout, Limites } from "@/lib/layout";

/**
 * Layout padrão do Painel Executivo (D43): grade de 12 colunas; `altura` em
 * unidades de linha (a unidade é calculada para o padrão ocupar a tela sem rolar).
 * `coluna`/`linha` = coluna e linha do canto superior esquerdo. Ao mudar ids ou a estrutura, suba a `versao` (o salvo antigo é descartado).
 */
export const LAYOUT_PADRAO: Layout = {
  versao: 4,
  itens: [
    { id: "kpis", coluna: 0, linha: 0, largura: 12, altura: 5, visivel: true },
    { id: "evolucao-venda", coluna: 0, linha: 5, largura: 4, altura: 6, visivel: true },
    { id: "evolucao-margem", coluna: 4, linha: 5, largura: 4, altura: 6, visivel: true },
    { id: "meta", coluna: 8, linha: 5, largura: 4, altura: 6, visivel: true },
    { id: "departamentos", coluna: 0, linha: 11, largura: 8, altura: 7, visivel: true },
    { id: "alertas", coluna: 8, linha: 11, largura: 4, altura: 7, visivel: true },
  ],
  blocos: {
    kpis: [
      "venda",
      "lucro-bruto",
      "margem-bruta",
      "despesas-operacionais",
      "resultado-operacional",
      "venda-vs-meta",
      "ticket-medio",
      "compra-sobre-venda",
      "cancelamentos",
      "descontos",
    ].map((id) => ({ id, coluna: 0, linha: 0, largura: 1, altura: 1, visivel: true })),
  },
};

/** Tamanhos mínimo e máximo de cada card (colunas × linhas). */
export const LIMITES: Limites = {
  kpis: { min: { largura: 4, altura: 3 }, max: { largura: 12, altura: 10 } },
  "evolucao-venda": { min: { largura: 3, altura: 4 }, max: { largura: 12, altura: 12 } },
  "evolucao-margem": { min: { largura: 3, altura: 4 }, max: { largura: 12, altura: 12 } },
  meta: { min: { largura: 3, altura: 5 }, max: { largura: 8, altura: 10 } },
  departamentos: { min: { largura: 5, altura: 4 }, max: { largura: 12, altura: 20 } },
  alertas: { min: { largura: 3, altura: 4 }, max: { largura: 12, altura: 20 } },
};

export const ROTULOS: Record<string, string> = {
  kpis: "Indicadores",
  "evolucao-venda": "Evolução da Venda",
  "evolucao-margem": "Evolução da Margem Bruta",
  meta: "Venda vs Meta (acumulado)",
  departamentos: "Compra sobre Venda",
  alertas: "Alertas e Pontos de Atenção",
};

/**
 * Fontes de dados de cada card e KPI (`kpis:<id>`), D46: na plataforma que não
 * envia alguma delas ao banco do BI, o card fica desabilitado. A tela inteira
 * exige `venda` (`TELAS` em `src/lib/acesso.ts`).
 */
export const FONTES: Record<string, readonly Fonte[]> = {
  "evolucao-venda": ["venda"],
  "evolucao-margem": ["venda"],
  meta: ["metas", "venda"],
  departamentos: ["venda", "compra"],
  // Os alertas comparam venda, despesas, cancelamentos (sobre a venda PDV) e compra sobre venda.
  alertas: ["venda", "pdv", "cancelamentos", "despesas", "compra"],
  "kpis:venda": ["venda"],
  "kpis:lucro-bruto": ["venda"],
  "kpis:margem-bruta": ["venda"],
  "kpis:despesas-operacionais": ["despesas", "venda"],
  "kpis:resultado-operacional": ["despesas", "venda"],
  "kpis:venda-vs-meta": ["metas", "venda"],
  "kpis:ticket-medio": ["pdv"],
  "kpis:compra-sobre-venda": ["compra", "venda"],
  "kpis:cancelamentos": ["cancelamentos", "pdv"],
  "kpis:descontos": ["pdv"],
};
