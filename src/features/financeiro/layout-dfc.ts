import type { Fonte } from "@/lib/acesso";
import type { Layout, Limites } from "@/lib/layout";

/**
 * Layout padrão da tela Financeiro · DFC (D43): grade de 12 colunas.
 * `coluna`/`linha` = coluna e linha do canto superior esquerdo; `altura` em unidades de linha (a unidade é calculada para o
 * padrão ocupar a tela sem rolar). Ao mudar ids ou a estrutura, suba a `versao`.
 */
export const LAYOUT_PADRAO: Layout = {
  versao: 3,
  itens: [
    { id: "kpis", coluna: 0, linha: 0, largura: 12, altura: 3, visivel: true },
    { id: "tabela", coluna: 0, linha: 3, largura: 7, altura: 9, visivel: true },
    { id: "evolucao", coluna: 7, linha: 3, largura: 5, altura: 4, visivel: true },
    { id: "composicao", coluna: 7, linha: 7, largura: 5, altura: 5, visivel: true },
    { id: "saldo-conta", coluna: 0, linha: 12, largura: 5, altura: 6, visivel: true },
    { id: "movimentacoes", coluna: 5, linha: 12, largura: 7, altura: 6, visivel: true },
  ],
  blocos: {
    kpis: ["saldo-inicial", "entradas", "saidas", "geracao", "saldo-final"].map((id) => ({
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
  tabela: { min: { largura: 5, altura: 5 }, max: { largura: 12, altura: 20 } },
  evolucao: { min: { largura: 3, altura: 4 }, max: { largura: 12, altura: 14 } },
  composicao: { min: { largura: 3, altura: 4 }, max: { largura: 12, altura: 14 } },
  "saldo-conta": { min: { largura: 3, altura: 4 }, max: { largura: 12, altura: 14 } },
  movimentacoes: { min: { largura: 3, altura: 4 }, max: { largura: 12, altura: 14 } },
};

export const ROTULOS: Record<string, string> = {
  kpis: "Indicadores",
  tabela: "DFC Gerencial",
  evolucao: "Evolução da Geração de Caixa",
  composicao: "Composição das Entradas e Saídas",
  "saldo-conta": "Saldo por Conta Financeira",
  movimentacoes: "Movimentações Relevantes do Período",
};

/**
 * Fontes de dados por card (D46). A DFC ainda não tem fonte de caixa (P51):
 * quando tiver, declare aqui as fontes de cada card.
 */
export const FONTES: Record<string, readonly Fonte[]> = {};
