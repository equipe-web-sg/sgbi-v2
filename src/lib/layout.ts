/**
 * Layout personalizável das telas (D43): grade de 12 colunas e linhas de altura
 * fixa (unidades). Cada card tem posição (`coluna`, `linha`) e tamanho (`largura`, `altura`); os
 * cards não se sobrepõem. Quando um card cresce, é movido ou trocado sobre
 * outro, quem ficar por baixo é empurrado para baixo; depois, todos sobem até
 * encostar no card de cima (ou no topo), sem mudar de tamanho, para não sobrar
 * espaço vazio acima deles (`compactar`). Na horizontal, os espaços continuam
 * permitidos. Funções puras: o estado e o `localStorage` ficam em
 * `src/components/layout/use-layout.ts`.
 */

export const COLUNAS = 12;
/** Largura máxima de um item de bloco (KPI), em colunas internas do bloco. */
export const MAX_COLUNAS_ITEM_BLOCO = 3;

/**
 * `coluna` = coluna (0 a 11), `linha` = linha (unidade de altura, a partir de 0),
 * `largura` = largura em colunas, `altura` = altura em unidades. Nos blocos
 * internos (KPIs) só `largura` conta e a ordem é a da lista.
 */
export type ItemLayout = { id: string; coluna: number; linha: number; largura: number; altura: number; visivel: boolean };
export type Layout = {
  versao: number;
  itens: ItemLayout[];
  /** Itens de blocos internos (ex.: os KPIs dentro do card `kpis`), por id do bloco. */
  blocos: Record<string, ItemLayout[]>;
};

export type Tamanho = { largura: number; altura: number };
export type LimitesCard = { min: Tamanho; max: Tamanho };
export type Limites = Record<string, LimitesCard>;
/** Bordas que podem ser arrastadas para redimensionar. */
export type Borda = "esquerda" | "direita" | "topo" | "base" | "topo-esquerda" | "topo-direita" | "base-esquerda" | "base-direita";
export type Caixa = { coluna: number; linha: number; largura: number; altura: number };

const clamp = (valor: number, min: number, max: number) => Math.min(Math.max(valor, min), max);
const SEM_LIMITE: LimitesCard = { min: { largura: 1, altura: 1 }, max: { largura: COLUNAS, altura: 40 } };
export const limitesDe = (limites: Limites, id: string) => limites[id] ?? SEM_LIMITE;

export const colide = (caixa: Caixa, outra: Caixa) => caixa.coluna < outra.coluna + outra.largura && outra.coluna < caixa.coluna + caixa.largura && caixa.linha < outra.linha + outra.altura && outra.linha < caixa.linha + caixa.altura;

export const encontrar = (layout: Layout, id: string) => layout.itens.find((itemLayout) => itemLayout.id === id);

/** Linha seguinte ao card visível mais baixo (altura total ocupada, em unidades). */
export const alturaTotal = (layout: Layout) =>
  layout.itens.reduce((acumulado, item) => (item.visivel ? Math.max(acumulado, item.linha + item.altura) : acumulado), 0);

/**
 * Sobe cada card visível, de cima para baixo, até encostar no de cima (ou no
 * topo), sem mudar o tamanho nem a coluna: não sobra espaço vazio acima de
 * nenhum card. Ocultos não contam (guardam a posição para voltar a ela).
 */
function compactar(itens: ItemLayout[]): ItemLayout[] {
  const colocados: ItemLayout[] = [];
  for (const item of itens.filter((itemLayout) => itemLayout.visivel).sort((anterior, proximo) => anterior.linha - proximo.linha || anterior.coluna - proximo.coluna)) {
    let linha = item.linha;
    while (linha > 0 && !colocados.some((itemLayout) => colide({ ...item, linha: linha - 1 }, itemLayout))) linha--;
    colocados.push(linha === item.linha ? item : { ...item, linha: linha });
  }
  const porId = new Map(colocados.map((itemLayout) => [itemLayout.id, itemLayout]));
  return itens.map((itemLayout) => porId.get(itemLayout.id) ?? itemLayout);
}

/**
 * Desfaz sobreposições e compacta: os cards de `primeiro` ficam onde estão (na
 * ordem dada) e os demais, de cima para baixo, descem até não encostar em
 * ninguém; depois todos sobem o que puderem (`compactar`). Ocultos não contam.
 */
function acomodar(itens: ItemLayout[], primeiro: string[] = []): ItemLayout[] {
  const fixos = primeiro.map((id) => itens.find((candidato) => candidato.id === id)).filter((candidato): candidato is ItemLayout => !!candidato);
  const resto = itens.filter((itemLayout) => !primeiro.includes(itemLayout.id)).sort((anterior, proximo) => anterior.linha - proximo.linha || anterior.coluna - proximo.coluna);
  const colocados: ItemLayout[] = [];
  for (const item of [...fixos, ...resto]) {
    if (!item.visivel) {
      colocados.push(item);
      continue;
    }
    let linha = item.linha;
    for (;;) {
      const batidos = colocados.filter((itemLayout) => itemLayout.visivel && colide({ ...item, linha: linha }, itemLayout));
      if (!batidos.length) break;
      linha = Math.max(...batidos.map((itemLayout) => itemLayout.linha + itemLayout.altura));
    }
    colocados.push(linha === item.linha ? item : { ...item, linha: linha });
  }
  // Mantém a ordem original da lista (estável para o React e para o salvo).
  const porId = new Map(colocados.map((itemLayout) => [itemLayout.id, itemLayout]));
  return compactar(itens.map((itemLayout) => porId.get(itemLayout.id)!));
}

/** Card dentro da grade e dos limites de tamanho dele. */
function dentro(item: ItemLayout, limites: Limites): ItemLayout {
  const { min, max } = limitesDe(limites, item.id);
  const largura = clamp(Math.round(item.largura), min.largura, Math.min(max.largura, COLUNAS));
  return {
    ...item,
    largura: largura,
    altura: clamp(Math.round(item.altura), min.altura, max.altura),
    coluna: clamp(Math.round(item.coluna), 0, COLUNAS - largura),
    linha: Math.max(0, Math.round(item.linha)),
  };
}

/**
 * Corrige um layout salvo contra o padrão atual: descarta ids que não existem
 * mais, acrescenta os cards novos embaixo de tudo (tamanho padrão), aplica os
 * limites, desfaz sobreposições e compacta.
 */
export function normalizar(salvo: Partial<Layout> | null | undefined, padrao: Layout, limites: Limites): Layout {
  if (!salvo || salvo.versao !== padrao.versao || !Array.isArray(salvo.itens)) return padrao;

  const padraoPorId = new Map(padrao.itens.map((itemLayout) => [itemLayout.id, itemLayout]));
  const vistos = new Set<string>();
  const itens: ItemLayout[] = [];
  for (const itemLayout of salvo.itens) {
    if (!itemLayout || !padraoPorId.has(itemLayout.id) || vistos.has(itemLayout.id)) continue;
    vistos.add(itemLayout.id);
    itens.push(
      dentro(
        {
          id: itemLayout.id,
          coluna: Number(itemLayout.coluna) || 0,
          linha: Number(itemLayout.linha) || 0,
          largura: Number(itemLayout.largura) || 0,
          altura: Number(itemLayout.altura) || 0,
          visivel: itemLayout.visivel !== false,
        },
        limites,
      ),
    );
  }
  let base = alturaTotal({ ...padrao, itens });
  for (const novo of padrao.itens.filter((itemLayout) => !vistos.has(itemLayout.id))) {
    itens.push({ ...novo, coluna: 0, linha: base });
    base += novo.altura;
  }

  const blocos: Record<string, ItemLayout[]> = {};
  for (const [bloco, itensPadrao] of Object.entries(padrao.blocos)) {
    const salvos = Array.isArray(salvo.blocos?.[bloco]) ? salvo.blocos[bloco] : [];
    const porId = new Map(itensPadrao.map((itemLayout) => [itemLayout.id, itemLayout]));
    const lista = salvos
      .filter((itemLayout) => itemLayout && porId.has(itemLayout.id))
      .map((itemLayout) => ({
        ...porId.get(itemLayout.id)!,
        largura: clamp(Math.round(Number(itemLayout.largura) || 1), 1, MAX_COLUNAS_ITEM_BLOCO),
        visivel: itemLayout.visivel !== false,
      }));
    const presentes = new Set(lista.map((item) => item.id));
    blocos[bloco] = [...lista, ...itensPadrao.filter((itemLayout) => !presentes.has(itemLayout.id)).map((itemLayout) => ({ ...itemLayout }))];
  }

  return { versao: padrao.versao, itens: acomodar(itens), blocos };
}

const comItem = (layout: Layout, id: string, transformar: (item: ItemLayout) => ItemLayout): Layout => ({
  ...layout,
  itens: layout.itens.map((itemLayout) => (itemLayout.id === id ? transformar(itemLayout) : itemLayout)),
});

/**
 * Novo tamanho (e posição, pelas bordas esquerda e de cima) do card, dentro da
 * grade e dos limites; a borda oposta à arrastada fica parada. Quem ficar por
 * baixo desce.
 */
export function redimensionar(layout: Layout, id: string, desejado: Caixa, borda: Borda, limites: Limites): Layout {
  const { min, max } = limitesDe(limites, id);
  const atual = encontrar(layout, id);
  if (!atual) return layout;
  let { coluna: coluna, linha: linha, largura: largura, altura: altura } = atual;
  if (borda.includes("esquerda")) {
    const direita = atual.coluna + atual.largura;
    coluna = clamp(desejado.coluna, Math.max(0, direita - max.largura), direita - min.largura);
    largura = direita - coluna;
  } else if (borda.includes("direita")) {
    largura = clamp(desejado.largura, min.largura, Math.min(max.largura, COLUNAS - coluna));
  }
  if (borda.includes("topo")) {
    const base = atual.linha + atual.altura;
    linha = clamp(desejado.linha, Math.max(0, base - max.altura), base - min.altura);
    altura = base - linha;
  } else if (borda.includes("base")) {
    altura = clamp(desejado.altura, min.altura, max.altura);
  }
  if (coluna === atual.coluna && linha === atual.linha && largura === atual.largura && altura === atual.altura) return layout;
  return { ...layout, itens: acomodar(comItem(layout, id, (itemLayout) => ({ ...itemLayout, coluna: coluna, linha: linha, largura: largura, altura: altura })).itens, [id]) };
}

/** Move o card para a coluna e a linha indicadas; quem ficar por baixo desce. */
export function posicionar(layout: Layout, id: string, coluna: number, linha: number, limites: Limites): Layout {
  const movido = comItem(layout, id, (itemLayout) => dentro({ ...itemLayout, coluna: coluna, linha: linha }, limites));
  return { ...layout, itens: acomodar(movido.itens, [id]) };
}

/**
 * Troca dois cards de lugar: cada um vai para o canto superior esquerdo do outro,
 * mantendo o próprio tamanho (ajustado para caber nas 12 colunas). Se ainda se
 * sobrepuserem, ou baterem em outros, quem estiver por baixo desce.
 */
export function trocar(layout: Layout, idA: string, idB: string, limites: Limites): Layout {
  const itemA = encontrar(layout, idA);
  const itemB = encontrar(layout, idB);
  if (!itemA || !itemB || idA === idB) return layout;
  const itens = layout.itens.map((itemLayout) =>
    itemLayout.id === idA
      ? dentro({ ...itemLayout, coluna: itemB.coluna, linha: itemB.linha }, limites)
      : itemLayout.id === idB
        ? dentro({ ...itemLayout, coluna: itemA.coluna, linha: itemA.linha }, limites)
        : itemLayout,
  );
  // Quem está mais acima fica parado; o outro desce se os dois ainda se sobrepuserem.
  const ordem = itemA.linha <= itemB.linha ? [idB, idA] : [idA, idB];
  return { ...layout, itens: acomodar(itens, ordem) };
}

/** Os cards de baixo sobem para o lugar dele (ele guarda a posição para voltar a ela). */
export function ocultar(layout: Layout, id: string): Layout {
  const oculto = comItem(layout, id, (item) => ({ ...item, visivel: false }));
  return { ...layout, itens: compactar(oculto.itens) };
}

/** Mostra de novo no lugar de antes (ou mais acima, se houver espaço); quem estiver lá desce. */
export function mostrar(layout: Layout, id: string): Layout {
  const visivel = comItem(layout, id, (itemLayout) => ({ ...itemLayout, visivel: true }));
  return { ...layout, itens: acomodar(visivel.itens, [id]) };
}

/**
 * Layout mostrado durante o arraste: o resultado de `depois` para todos, menos o
 * card arrastado, que continua no lugar de origem (é ele que o dnd-kit move).
 */
export function semMoverArrastado(antes: Layout, depois: Layout, id: string): Layout {
  const origem = encontrar(antes, id);
  if (!origem) return depois;
  return { ...depois, itens: depois.itens.map((itemLayout) => (itemLayout.id === id ? origem : itemLayout)) };
}

// ---------- Blocos internos (KPIs): uma lista em ordem, larguras de 1 a 3 colunas internas.

export function alterarItemBloco(layout: Layout, bloco: string, id: string, mudanca: Partial<ItemLayout>): Layout {
  return {
    ...layout,
    blocos: {
      ...layout.blocos,
      [bloco]: (layout.blocos[bloco] ?? []).map((itemLayout) => (itemLayout.id === id ? { ...itemLayout, ...mudanca } : itemLayout)),
    },
  };
}

/** Nova ordem dos itens visíveis de um bloco; os ocultos ficam no fim. */
export function ordenarBloco(layout: Layout, bloco: string, ids: string[]): Layout {
  const itens = layout.blocos[bloco] ?? [];
  const porId = new Map(itens.map((itemLayout) => [itemLayout.id, itemLayout]));
  return {
    ...layout,
    blocos: {
      ...layout.blocos,
      [bloco]: [...ids.map((id) => porId.get(id)!).filter(Boolean), ...itens.filter((itemLayout) => !itemLayout.visivel)],
    },
  };
}

/** Ids ocultos (cards da grade e itens de blocos). */
export function ocultos(layout: Layout) {
  return {
    cards: layout.itens.filter((itemLayout) => !itemLayout.visivel).map((itemLayout) => itemLayout.id),
    blocos: Object.fromEntries(
      Object.entries(layout.blocos).map(([bloco, itens]) => [bloco, itens.filter((itemLayout) => !itemLayout.visivel).map((itemLayout) => itemLayout.id)]),
    ) as Record<string, string[]>,
  };
}
