import { describe, expect, it } from "vitest";
import {
  alterarItemBloco,
  alturaTotal,
  colide,
  COLUNAS,
  encontrar,
  mostrar,
  normalizar,
  ocultar,
  ocultos,
  ordenarBloco,
  posicionar,
  redimensionar,
  semMoverArrastado,
  trocar,
  type ItemLayout,
  type Layout,
  type Limites,
} from "./layout";

const item = (id: string, coluna: number, linha: number, largura: number, altura: number, visivel = true): ItemLayout => ({
  id,
  coluna: coluna,
  linha: linha,
  largura: largura,
  altura: altura,
  visivel,
});

const layoutDe = (itens: ItemLayout[], blocos: Layout["blocos"] = {}): Layout => ({ versao: 1, itens, blocos });

const LIMITES: Limites = {
  "a": { min: { largura: 2, altura: 2 }, max: { largura: 12, altura: 10 } },
  "b": { min: { largura: 2, altura: 2 }, max: { largura: 12, altura: 10 } },
  "c": { min: { largura: 2, altura: 2 }, max: { largura: 12, altura: 10 } },
  "d": { min: { largura: 2, altura: 2 }, max: { largura: 12, altura: 10 } },
};

// a | b
// c (largura total)
const PADRAO = layoutDe([item("a", 0, 0, 6, 4), item("b", 6, 0, 6, 4), item("c", 0, 4, 12, 3)]);

/** Invariantes que valem depois de qualquer operação. */
function conferir(layout: Layout) {
  const visiveis = layout.itens.filter((itemLayout) => itemLayout.visivel);
  for (const itemLayout of layout.itens) {
    expect(itemLayout.coluna, `${itemLayout.id}.x`).toBeGreaterThanOrEqual(0);
    expect(itemLayout.linha, `${itemLayout.id}.y`).toBeGreaterThanOrEqual(0);
    expect(itemLayout.coluna + itemLayout.largura, `${itemLayout.id} passa das ${COLUNAS} colunas`).toBeLessThanOrEqual(COLUNAS);
  }
  // Nenhum par de cards visíveis se sobrepõe.
  for (let indiceA = 0; indiceA < visiveis.length; indiceA++) {
    for (let indiceB = indiceA + 1; indiceB < visiveis.length; indiceB++) {
      expect(colide(visiveis[indiceA], visiveis[indiceB]), `${visiveis[indiceA].id} × ${visiveis[indiceB].id} sobrepostos`).toBe(false);
    }
  }
  // Compactado: ninguém tem espaço livre logo acima (ou está no topo ou encosta em outro).
  for (const itemLayout of visiveis) {
    if (itemLayout.linha === 0) continue;
    const encosta = visiveis.some((outro) => outro !== itemLayout && colide({ ...itemLayout, linha: itemLayout.linha - 1 }, outro));
    expect(encosta, `${itemLayout.id} com espaço vazio acima`).toBe(true);
  }
}

describe("colide", () => {
  it("caixas que só se tocam nas bordas não colidem", () => {
    expect(colide({ coluna: 0, linha: 0, largura: 6, altura: 4 }, { coluna: 6, linha: 0, largura: 6, altura: 4 })).toBe(false);
    expect(colide({ coluna: 0, linha: 0, largura: 6, altura: 4 }, { coluna: 0, linha: 4, largura: 6, altura: 4 })).toBe(false);
  });

  it("caixas que se cruzam colidem", () => {
    expect(colide({ coluna: 0, linha: 0, largura: 6, altura: 4 }, { coluna: 5, linha: 3, largura: 6, altura: 4 })).toBe(true);
  });
});

describe("alturaTotal", () => {
  it("é a linha seguinte ao card visível mais baixo, ignorando ocultos", () => {
    expect(alturaTotal(PADRAO)).toBe(7);
    expect(alturaTotal(layoutDe([item("a", 0, 0, 6, 4), item("b", 0, 10, 6, 4, false)]))).toBe(4);
    expect(alturaTotal(layoutDe([]))).toBe(0);
  });
});

describe("posicionar", () => {
  it("mover um card sobre outro empurra quem estava lá para baixo, sem sobrepor", () => {
    const resultado = posicionar(PADRAO, "c", 0, 0, LIMITES);
    conferir(resultado);
    expect(encontrar(resultado, "c")).toMatchObject({ coluna: 0, linha: 0, largura: 12 });
    // a e b descem para baixo de c.
    expect(encontrar(resultado, "a")!.linha).toBe(3);
    expect(encontrar(resultado, "b")!.linha).toBe(3);
  });

  it("mantém o tamanho dos cards ao mover", () => {
    const resultado = posicionar(PADRAO, "a", 3, 8, LIMITES);
    conferir(resultado);
    expect(encontrar(resultado, "a")).toMatchObject({ largura: 6, altura: 4 });
  });

  it("não deixa o card passar da última coluna", () => {
    const resultado = posicionar(PADRAO, "a", 11, 0, LIMITES);
    conferir(resultado);
    expect(encontrar(resultado, "a")!.coluna).toBe(6); // 12 colunas − largura 6
  });

  it("o card solto no vazio lá embaixo sobe até encostar (sem espaço vazio)", () => {
    const resultado = posicionar(PADRAO, "a", 0, 30, LIMITES);
    conferir(resultado);
    expect(encontrar(resultado, "a")!.linha).toBeLessThan(30);
  });
});

describe("trocar", () => {
  it("cada card vai para a posição do outro", () => {
    const resultado = trocar(PADRAO, "a", "b", LIMITES);
    conferir(resultado);
    expect(encontrar(resultado, "a")).toMatchObject({ coluna: 6, linha: 0 });
    expect(encontrar(resultado, "b")).toMatchObject({ coluna: 0, linha: 0 });
  });

  it("trocar um card com ele mesmo, ou com id inexistente, não muda nada", () => {
    expect(trocar(PADRAO, "a", "a", LIMITES)).toBe(PADRAO);
    expect(trocar(PADRAO, "a", "zzz", LIMITES)).toBe(PADRAO);
  });

  it("cards de tamanhos diferentes não ficam sobrepostos depois da troca", () => {
    const resultado = trocar(PADRAO, "a", "c", LIMITES);
    conferir(resultado);
    expect(resultado.itens).toHaveLength(3);
  });
});

describe("redimensionar", () => {
  it("crescer para baixo empurra quem está embaixo", () => {
    const resultado = redimensionar(PADRAO, "a", { coluna: 0, linha: 0, largura: 6, altura: 6 }, "base", LIMITES);
    conferir(resultado);
    expect(encontrar(resultado, "a")!.altura).toBe(6);
    expect(encontrar(resultado, "c")!.linha).toBeGreaterThanOrEqual(6);
  });

  it("respeita o tamanho mínimo e o máximo", () => {
    const menor = redimensionar(PADRAO, "a", { coluna: 0, linha: 0, largura: 1, altura: 1 }, "base-direita", LIMITES);
    expect(encontrar(menor, "a")).toMatchObject({ largura: 2, altura: 2 });
    const maior = redimensionar(PADRAO, "a", { coluna: 0, linha: 0, largura: 99, altura: 99 }, "base-direita", LIMITES);
    expect(encontrar(maior, "a")!.altura).toBe(10);
    expect(encontrar(maior, "a")!.coluna + encontrar(maior, "a")!.largura).toBeLessThanOrEqual(COLUNAS);
    conferir(maior);
  });

  it("pela borda esquerda, a borda direita fica parada", () => {
    const resultado = redimensionar(PADRAO, "b", { coluna: 8, linha: 0, largura: 4, altura: 4 }, "esquerda", LIMITES);
    const itemLayout = encontrar(resultado, "b")!;
    expect(itemLayout.coluna + itemLayout.largura).toBe(12);
    expect(itemLayout.largura).toBe(4);
  });

  it("sem mudança devolve o mesmo layout (mesma referência)", () => {
    expect(redimensionar(PADRAO, "a", { coluna: 0, linha: 0, largura: 6, altura: 4 }, "base-direita", LIMITES)).toBe(PADRAO);
  });

  it("id inexistente não muda nada", () => {
    expect(redimensionar(PADRAO, "zzz", { coluna: 0, linha: 0, largura: 3, altura: 3 }, "base-direita", LIMITES)).toBe(PADRAO);
  });
});

describe("ocultar e mostrar", () => {
  it("ocultar faz os de baixo subirem; o oculto guarda a posição", () => {
    const resultado = ocultar(ocultar(PADRAO, "a"), "b");
    conferir(resultado);
    expect(encontrar(resultado, "a")).toMatchObject({ visivel: false, coluna: 0, linha: 0, largura: 6, altura: 4 });
    expect(encontrar(resultado, "c")!.linha).toBe(0);
  });

  it("ocultar um só não faz subir quem ainda é segurado por outro card", () => {
    const resultado = ocultar(PADRAO, "a");
    conferir(resultado);
    expect(encontrar(resultado, "c")!.linha).toBe(4); // c é largo e o b continua em cima dele
  });

  it("mostrar volta para o lugar de antes e empurra quem estiver lá", () => {
    const resultado = mostrar(ocultar(PADRAO, "a"), "a");
    conferir(resultado);
    expect(encontrar(resultado, "a")).toMatchObject({ visivel: true, coluna: 0, linha: 0 });
    expect(resultado.itens.filter((itemLayout) => itemLayout.visivel)).toHaveLength(3);
  });

  it("ocultos lista os ids ocultos dos cards e dos blocos", () => {
    const layout = layoutDe([item("a", 0, 0, 6, 4, false), item("b", 6, 0, 6, 4)], {
      kpis: [item("k1", 0, 0, 1, 1, false), item("k2", 0, 0, 1, 1)],
    });
    expect(ocultos(layout)).toEqual({ cards: ["a"], blocos: { kpis: ["k1"] } });
  });
});

describe("sequência de operações", () => {
  it("o layout continua válido depois de várias edições seguidas", () => {
    let layout = PADRAO;
    layout = posicionar(layout, "c", 0, 0, LIMITES);
    conferir(layout);
    layout = redimensionar(layout, "a", { coluna: 0, linha: 0, largura: 12, altura: 5 }, "base-direita", LIMITES);
    conferir(layout);
    layout = trocar(layout, "a", "b", LIMITES);
    conferir(layout);
    layout = ocultar(layout, "c");
    conferir(layout);
    layout = mostrar(layout, "c");
    conferir(layout);
    layout = posicionar(layout, "b", 6, 2, LIMITES);
    conferir(layout);
    expect(layout.itens.map((itemLayout) => itemLayout.id).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("semMoverArrastado", () => {
  it("devolve o resultado novo, mas o card arrastado fica na origem", () => {
    const depois = posicionar(PADRAO, "a", 0, 8, LIMITES);
    const resultado = semMoverArrastado(PADRAO, depois, "a");
    expect(encontrar(resultado, "a")).toEqual(encontrar(PADRAO, "a"));
    expect(encontrar(resultado, "c")).toEqual(encontrar(depois, "c"));
  });
});

describe("normalizar (layout salvo no navegador)", () => {
  const padrao = layoutDe([item("a", 0, 0, 6, 4), item("b", 6, 0, 6, 4)], {
    kpis: [item("k1", 0, 0, 1, 1), item("k2", 0, 0, 1, 1), item("k3", 0, 0, 1, 1)],
  });

  it("sem layout salvo, usa o padrão", () => {
    expect(normalizar(null, padrao, LIMITES)).toBe(padrao);
    expect(normalizar(undefined, padrao, LIMITES)).toBe(padrao);
  });

  it("versão diferente descarta o salvo", () => {
    expect(normalizar({ ...padrao, versao: 99 }, padrao, LIMITES)).toBe(padrao);
  });

  it("salvo corrompido (itens que não é lista) cai no padrão", () => {
    expect(normalizar({ versao: 1, itens: "lixo" as never }, padrao, LIMITES)).toBe(padrao);
  });

  it("descarta ids que não existem mais e ignora duplicados", () => {
    const resultado = normalizar(
      { versao: 1, itens: [item("a", 0, 0, 6, 4), item("a", 0, 9, 6, 4), item("velho", 0, 0, 3, 3)], blocos: {} },
      padrao,
      LIMITES,
    );
    expect(resultado.itens.map((itemLayout) => itemLayout.id).sort()).toEqual(["a", "b"]);
  });

  it("card novo (que não estava salvo) entra embaixo de tudo, com o tamanho padrão", () => {
    const resultado = normalizar({ versao: 1, itens: [item("a", 0, 0, 6, 4)], blocos: {} }, padrao, LIMITES);
    conferir(resultado);
    expect(encontrar(resultado, "b")).toMatchObject({ coluna: 0, largura: 6, altura: 4 });
    expect(encontrar(resultado, "b")!.linha).toBeGreaterThanOrEqual(4);
  });

  it("aplica os limites de tamanho e corrige números inválidos", () => {
    const resultado = normalizar(
      {
        versao: 1,
        itens: [
          { id: "a", coluna: -5, linha: -2, largura: 99, altura: 0, visivel: true },
          { id: "b", coluna: Number.NaN, linha: 3, largura: 6, altura: 4, visivel: true },
        ],
        blocos: {},
      },
      padrao,
      LIMITES,
    );
    conferir(resultado);
    const itemLayout = encontrar(resultado, "a")!;
    expect(itemLayout.largura).toBeLessThanOrEqual(COLUNAS);
    expect(itemLayout.altura).toBeGreaterThanOrEqual(2);
  });

  it("desfaz sobreposição de um layout salvo antigo", () => {
    const resultado = normalizar(
      { versao: 1, itens: [item("a", 0, 0, 8, 4), item("b", 4, 0, 8, 4)], blocos: {} },
      padrao,
      LIMITES,
    );
    conferir(resultado);
  });

  it("visível ausente no salvo conta como visível; false é respeitado", () => {
    const resultado = normalizar(
      { versao: 1, itens: [item("a", 0, 0, 6, 4, false), { ...item("b", 6, 0, 6, 4), visivel: undefined as never }], blocos: {} },
      padrao,
      LIMITES,
    );
    expect(encontrar(resultado, "a")!.visivel).toBe(false);
    expect(encontrar(resultado, "b")!.visivel).toBe(true);
  });

  it("blocos: mantém a ordem e a largura salvas (de 1 a 3) e acrescenta os itens novos no fim", () => {
    const resultado = normalizar(
      {
        versao: 1,
        itens: padrao.itens,
        blocos: { kpis: [item("k2", 0, 0, 9, 1), item("k1", 0, 0, 2, 1, false), item("fantasma", 0, 0, 1, 1)] },
      },
      padrao,
      LIMITES,
    );
    expect(resultado.blocos.kpis.map((itemLayout) => itemLayout.id)).toEqual(["k2", "k1", "k3"]);
    expect(resultado.blocos.kpis[0].largura).toBe(3); // 9 limitado a 3
    expect(resultado.blocos.kpis[1]).toMatchObject({ largura: 2, visivel: false });
  });

  it("bloco ausente no salvo volta ao padrão", () => {
    const resultado = normalizar({ versao: 1, itens: padrao.itens }, padrao, LIMITES);
    expect(resultado.blocos.kpis.map((itemLayout) => itemLayout.id)).toEqual(["k1", "k2", "k3"]);
  });
});

describe("blocos internos (KPIs)", () => {
  const layout = layoutDe([], {
    kpis: [item("k1", 0, 0, 1, 1), item("k2", 0, 0, 1, 1), item("k3", 0, 0, 1, 1, false)],
  });

  it("alterarItemBloco muda só o item pedido", () => {
    const resultado = alterarItemBloco(layout, "kpis", "k2", { largura: 3, visivel: false });
    expect(resultado.blocos.kpis[1]).toMatchObject({ largura: 3, visivel: false });
    expect(resultado.blocos.kpis[0]).toEqual(layout.blocos.kpis[0]);
  });

  it("ordenarBloco põe os ids na ordem dada e os ocultos no fim", () => {
    const resultado = ordenarBloco(layout, "kpis", ["k2", "k1"]);
    expect(resultado.blocos.kpis.map((itemLayout) => itemLayout.id)).toEqual(["k2", "k1", "k3"]);
  });
});
