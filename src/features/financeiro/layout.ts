import type { Fonte } from "@/lib/acesso";
import type { Layout, Limites } from "@/lib/layout";

/**
 * Layout padrão da tela Financeiro · Fluxo de Caixa (D43): grade de 12 colunas.
 * `coluna`/`linha` = coluna e linha do canto superior esquerdo; `altura` em unidades de linha (a unidade é calculada para o
 * padrão ocupar a tela sem rolar). Ao mudar ids ou a estrutura, suba a `versao`.
 */
export const LAYOUT_PADRAO: Layout = {
  versao: 4,
  itens: [
    { id: "kpis", coluna: 0, linha: 0, largura: 12, altura: 3, visivel: true },
    { id: "evolucao-caixa", coluna: 0, linha: 3, largura: 7, altura: 5, visivel: true },
    { id: "categorias", coluna: 7, linha: 3, largura: 5, altura: 5, visivel: true },
    { id: "fluxo-previsto", coluna: 0, linha: 8, largura: 7, altura: 5, visivel: true },
    { id: "compromissos", coluna: 7, linha: 8, largura: 5, altura: 5, visivel: true },
    // "saldo-contas" fora do padrão (sem saldos bancários, P42): o código segue em `cards-inferiores.tsx`.
    { id: "evolucao-mensal", coluna: 0, linha: 13, largura: 8, altura: 5, visivel: true },
    { id: "indicadores-caixa", coluna: 8, linha: 13, largura: 4, altura: 5, visivel: true },
  ],
  blocos: {
    // "saldo" e "cobertura" fora do padrão (dependem do saldo bancário, P42): o código segue em `kpis-financeiro.tsx`.
    kpis: ["entradas", "saidas", "resultado", "menor-saldo"].map((id) => ({
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
  "evolucao-caixa": { min: { largura: 4, altura: 4 }, max: { largura: 12, altura: 12 } },
  categorias: { min: { largura: 4, altura: 4 }, max: { largura: 12, altura: 12 } },
  "fluxo-previsto": { min: { largura: 5, altura: 4 }, max: { largura: 12, altura: 20 } },
  compromissos: { min: { largura: 4, altura: 4 }, max: { largura: 12, altura: 20 } },
  "evolucao-mensal": { min: { largura: 4, altura: 4 }, max: { largura: 12, altura: 12 } },
  "indicadores-caixa": { min: { largura: 3, altura: 5 }, max: { largura: 8, altura: 12 } },
};

export const ROTULOS: Record<string, string> = {
  kpis: "Indicadores",
  "evolucao-caixa": "Evolução do Caixa",
  categorias: "Entradas e Saídas por Categoria",
  "fluxo-previsto": "Fluxo de Caixa Previsto",
  compromissos: "Compromissos a Vencer",
  "saldo-contas": "Saldo de Caixa por Conta",
  "evolucao-mensal": "Evolução das Entradas e Saídas",
  "indicadores-caixa": "Indicadores de Caixa",
};

/**
 * Fontes de dados por card (D46). Os cards usam contas a pagar, a receber e
 * cartões, que a tela inteira já exige (`TELAS` em `src/lib/acesso.ts`); o
 * Saldo por Conta não tem fonte (não integrado). Acrescente aqui o card que
 * passar a depender de outra fonte.
 */
export const FONTES: Record<string, readonly Fonte[]> = {};
