import type { Fonte } from "@/lib/acesso";
import type { Layout, Limites } from "@/lib/layout";

/**
 * Layout padrão da tela de Metas (D43): grade de 12 colunas.
 * `coluna`/`linha` = coluna e linha do canto superior esquerdo; `altura` em unidades de linha (a unidade é calculada para o
 * padrão ocupar a tela sem rolar). Ao mudar ids ou a estrutura, suba a `versao`.
 */
export const LAYOUT_PADRAO: Layout = {
  versao: 3,
  itens: [
    { id: "kpis", coluna: 0, linha: 0, largura: 12, altura: 3, visivel: true },
    { id: "cumprimento", coluna: 0, linha: 3, largura: 8, altura: 4, visivel: true },
    { id: "atingimento", coluna: 8, linha: 3, largura: 4, altura: 4, visivel: true },
    { id: "acompanhamento", coluna: 0, linha: 7, largura: 12, altura: 6, visivel: true },
    { id: "metas-periodo", coluna: 0, linha: 13, largura: 3, altura: 5, visivel: true },
    { id: "em-risco", coluna: 3, linha: 13, largura: 3, altura: 5, visivel: true },
    { id: "melhores", coluna: 6, linha: 13, largura: 3, altura: 5, visivel: true },
    { id: "margem", coluna: 9, linha: 13, largura: 3, altura: 5, visivel: true },
  ],
  blocos: {
    kpis: ["meta", "realizado", "atingimento", "diferenca", "projecao", "status"].map((id) => ({
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
  cumprimento: { min: { largura: 4, altura: 4 }, max: { largura: 12, altura: 12 } },
  atingimento: { min: { largura: 3, altura: 4 }, max: { largura: 12, altura: 14 } },
  acompanhamento: { min: { largura: 6, altura: 4 }, max: { largura: 12, altura: 20 } },
  "metas-periodo": { min: { largura: 3, altura: 5 }, max: { largura: 6, altura: 12 } },
  "em-risco": { min: { largura: 3, altura: 4 }, max: { largura: 6, altura: 12 } },
  melhores: { min: { largura: 3, altura: 4 }, max: { largura: 6, altura: 12 } },
  margem: { min: { largura: 3, altura: 4 }, max: { largura: 6, altura: 12 } },
};

export const ROTULOS: Record<string, string> = {
  kpis: "Indicadores",
  cumprimento: "Evolução do Cumprimento da Meta",
  atingimento: "Atingimento por Departamento",
  acompanhamento: "Acompanhamento das Metas",
  "metas-periodo": "Metas por Período",
  "em-risco": "Departamentos em Risco",
  melhores: "Melhor Desempenho",
  margem: "Situação da Margem Bruta",
};

/**
 * Fontes de dados por card (D46). Todos os cards usam meta e venda, que a tela
 * inteira já exige (`TELAS` em `src/lib/acesso.ts`); acrescente aqui o card que
 * passar a depender de outra fonte.
 */
export const FONTES: Record<string, readonly Fonte[]> = {};
