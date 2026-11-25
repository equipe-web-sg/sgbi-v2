import type { Fonte } from "@/lib/acesso";
import type { Layout, Limites } from "@/lib/layout";

/**
 * Layout padrão da tela de Vendas (D43): grade de 12 colunas.
 * `coluna`/`linha` = coluna e linha do canto superior esquerdo; `altura` em unidades de linha (a unidade é calculada para o
 * padrão ocupar a tela sem rolar). Ao mudar ids ou a estrutura, suba a `versao`.
 */
export const LAYOUT_PADRAO: Layout = {
  versao: 3,
  itens: [
    { id: "kpis", coluna: 0, linha: 0, largura: 12, altura: 3, visivel: true },
    { id: "evolucao-vendas", coluna: 0, linha: 3, largura: 4, altura: 5, visivel: true },
    { id: "departamentos", coluna: 4, linha: 3, largura: 4, altura: 5, visivel: true },
    { id: "evolucao-margem", coluna: 8, linha: 3, largura: 4, altura: 5, visivel: true },
    { id: "desempenho", coluna: 0, linha: 8, largura: 8, altura: 6, visivel: true },
    { id: "curva-abc", coluna: 8, linha: 8, largura: 4, altura: 6, visivel: true },
    { id: "queda", coluna: 0, linha: 14, largura: 3, altura: 4, visivel: true },
    { id: "crescimento", coluna: 3, linha: 14, largura: 3, altura: 4, visivel: true },
    { id: "maior-margem", coluna: 6, linha: 14, largura: 3, altura: 4, visivel: true },
    { id: "menor-margem", coluna: 9, linha: 14, largura: 3, altura: 4, visivel: true },
  ],
  blocos: {
    kpis: ["venda", "margem-bruta", "lucro-bruto", "ticket-medio", "cupons", "itens-por-cupom"].map((id) => ({
      id,
      coluna: 0,
      linha: 0,
      largura: 1,
      altura: 1,
      visivel: true,
    })),
  },
};

/** Tamanhos mínimo e máximo de cada card (colunas × linhas). */
export const LIMITES: Limites = {
  kpis: { min: { largura: 4, altura: 2 }, max: { largura: 12, altura: 10 } },
  "evolucao-vendas": { min: { largura: 3, altura: 4 }, max: { largura: 12, altura: 12 } },
  departamentos: { min: { largura: 3, altura: 4 }, max: { largura: 12, altura: 14 } },
  "evolucao-margem": { min: { largura: 3, altura: 4 }, max: { largura: 12, altura: 12 } },
  desempenho: { min: { largura: 5, altura: 4 }, max: { largura: 12, altura: 20 } },
  "curva-abc": { min: { largura: 4, altura: 4 }, max: { largura: 12, altura: 12 } },
  queda: { min: { largura: 3, altura: 4 }, max: { largura: 6, altura: 12 } },
  crescimento: { min: { largura: 3, altura: 4 }, max: { largura: 6, altura: 12 } },
  "maior-margem": { min: { largura: 3, altura: 4 }, max: { largura: 6, altura: 12 } },
  "menor-margem": { min: { largura: 3, altura: 4 }, max: { largura: 6, altura: 12 } },
};

export const ROTULOS: Record<string, string> = {
  kpis: "Indicadores",
  "evolucao-vendas": "Evolução das Vendas",
  departamentos: "Vendas por Departamento",
  "evolucao-margem": "Evolução da Margem Bruta",
  desempenho: "Desempenho de Vendas",
  "curva-abc": "Classificação ABC de Produtos",
  queda: "Produtos A com maior queda",
  crescimento: "Produtos A com maior crescimento",
  "maior-margem": "Produtos com maior margem bruta",
  "menor-margem": "Produtos com menor margem bruta",
};

/**
 * Fontes de dados de cada card e KPI (`kpis:<id>`), D46: na plataforma que não
 * envia alguma delas ao banco do BI, o card fica desabilitado. A tela inteira
 * exige `venda` (`TELAS` em `src/lib/acesso.ts`).
 */
export const FONTES: Record<string, readonly Fonte[]> = {
  "evolucao-vendas": ["venda"],
  departamentos: ["venda"],
  "evolucao-margem": ["venda"],
  desempenho: ["venda", "pdv"],
  "curva-abc": ["venda"],
  queda: ["venda"],
  crescimento: ["venda"],
  "maior-margem": ["venda"],
  "menor-margem": ["venda"],
  "kpis:venda": ["venda"],
  "kpis:margem-bruta": ["venda"],
  "kpis:lucro-bruto": ["venda"],
  "kpis:ticket-medio": ["pdv"],
  "kpis:cupons": ["pdv"],
  "kpis:itens-por-cupom": ["pdv"],
};
