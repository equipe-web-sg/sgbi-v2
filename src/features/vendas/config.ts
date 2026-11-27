/**
 * Regras ajustáveis da tela de Vendas (pendências P24 e P26 em
 * docs/decisoes-e-pendencias.md). Ajuste aqui quando a área de negócio definir.
 */
export const VENDAS_CONFIG = {
  /**
   * Faixas da Curva ABC em % acumulado do critério (venda ou lucro).
   * No BI antigo vêm do login do VX (`curvaABC`), por cliente.
   */
  abc: { A: 70, B: 20 },
  /** Produtos de cada lista (o card mostra quantos couberem na altura dele e rola; "Ver todos" abre a lista inteira). */
  tamanhoLista: 50,
  /** Departamentos no gráfico de barras; o resto vira "Outros". */
  departamentosNoGrafico: 7,
} as const;
