"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { Borda } from "@/lib/layout";

const CURSOR: Record<Borda, string> = {
  esquerda: "ew-resize",
  direita: "ew-resize",
  topo: "ns-resize",
  base: "ns-resize",
  "topo-esquerda": "nwse-resize",
  "base-direita": "nwse-resize",
  "topo-direita": "nesw-resize",
  "base-esquerda": "nesw-resize",
};

// Faixas por toda a borda (fáceis de pegar mesmo em cards pequenos), um pouco para fora do card.
const POSICAO: Record<Borda, string> = {
  esquerda: "inset-y-3 -left-1.5 w-3",
  direita: "inset-y-3 -right-1.5 w-3",
  topo: "inset-x-3 -top-1.5 h-3",
  base: "inset-x-3 -bottom-1.5 h-3",
  "topo-esquerda": "-left-2 -top-2 size-4",
  "topo-direita": "-right-2 -top-2 size-4",
  "base-esquerda": "-bottom-2 -left-2 size-4",
  "base-direita": "-bottom-2 -right-2 size-4",
};

const MARCA: Record<Borda, string> = {
  esquerda: "h-8 max-h-[60%] w-1",
  direita: "h-8 max-h-[60%] w-1",
  topo: "h-1 w-8 max-w-[60%]",
  base: "h-1 w-8 max-w-[60%]",
  "topo-esquerda": "size-2.5",
  "topo-direita": "size-2.5",
  "base-esquerda": "size-2.5",
  "base-direita": "size-2.5",
};

/** Encerra o arraste de redimensionar em andamento (só existe um por vez, na página inteira). */
let encerrarAtivo: (() => void) | null = null;

/**
 * Alça de redimensionar numa borda ou canto do card: arrastar chama `aoMover`
 * com o deslocamento do ponteiro (px) desde o início; o card decide o encaixe.
 * Pelo teclado, as setas chamam `aoTeclar` com a direção (−1, 0 ou +1 por eixo),
 * como se o ponteiro andasse uma coluna ou linha.
 */
export function AlcaBorda({
  borda,
  rotulo,
  aoIniciar,
  aoMover,
  aoSoltar,
  aoTeclar,
  noTeclado = true,
}: {
  borda: Borda;
  rotulo: string;
  aoIniciar?: () => void;
  aoMover: (dx: number, dy: number) => void;
  aoSoltar?: () => void;
  aoTeclar: (dx: number, dy: number) => void;
  /** Cantos ficam fora da ordem do Tab (as bordas já cobrem o teclado). */
  noTeclado?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  // As funções mais recentes, lidas no momento do arraste.
  const acoes = useRef({ aoIniciar, aoMover, aoSoltar });
  useEffect(() => {
    acoes.current = { aoIniciar, aoMover, aoSoltar };
  });

  // Listener nativo no próprio botão: o card inteiro é alça de arrastar (dnd-kit escuta o pointerdown
  // nele), e o stopPropagation do React chegaria tarde demais.
  useEffect(() => {
    const alvo = ref.current;
    if (!alvo) return;
    // Arraste desta alça em andamento (encerrado se a alça sair da tela no meio dele).
    let meu: (() => void) | null = null;
    const iniciar = (evento: PointerEvent) => {
      if (evento.button !== 0 || !evento.isPrimary) return;
      evento.preventDefault();
      evento.stopPropagation();
      // Um arraste por vez: se o anterior não terminou (soltar fora da janela, por exemplo), encerra antes.
      encerrarAtivo?.();
      const { clientX: x0, clientY: y0, pointerId } = evento;
      acoes.current.aoIniciar?.();
      // Com o ponteiro capturado, o pointerup chega mesmo fora da janela. Em eventos sintéticos falha: sem problema.
      try {
        alvo.setPointerCapture(pointerId);
      } catch {}
      const mover = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        // Botão já solto sem o pointerup ter chegado (soltou fora da janela, trocou de aba): encerra, e
        // não deixa um arraste "fantasma" seguindo o ponteiro.
        if (ev.buttons === 0 && ev.pointerType === "mouse") return soltar();
        acoes.current.aoMover(ev.clientX - x0, ev.clientY - y0);
      };
      const fim = (ev: Event) => {
        if (ev instanceof PointerEvent && ev.pointerId !== pointerId) return;
        soltar();
      };
      const soltar = () => {
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", fim);
        window.removeEventListener("pointercancel", fim);
        window.removeEventListener("blur", soltar);
        alvo.removeEventListener("lostpointercapture", fim);
        document.body.style.removeProperty("cursor");
        try {
          alvo.releasePointerCapture(pointerId);
        } catch {}
        if (encerrarAtivo === soltar) encerrarAtivo = null;
        meu = null;
        acoes.current.aoSoltar?.();
      };
      encerrarAtivo = soltar;
      meu = soltar;
      document.body.style.cursor = CURSOR[borda];
      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", fim);
      window.addEventListener("pointercancel", fim);
      window.addEventListener("blur", soltar);
      alvo.addEventListener("lostpointercapture", fim);
    };
    alvo.addEventListener("pointerdown", iniciar);
    return () => {
      alvo.removeEventListener("pointerdown", iniciar);
      meu?.();
    };
  }, [borda]);

  const teclar = (evento: KeyboardEvent) => {
    const horizontal = borda.includes("esquerda") || borda.includes("direita");
    const vertical = borda.includes("topo") || borda.includes("base");
    const dx = horizontal ? (({ ArrowRight: 1, ArrowLeft: -1 } as Record<string, number>)[evento.key] ?? 0) : 0;
    const dy = vertical ? (({ ArrowDown: 1, ArrowUp: -1 } as Record<string, number>)[evento.key] ?? 0) : 0;
    if (!dx && !dy) return;
    evento.preventDefault();
    evento.stopPropagation();
    aoTeclar(dx, dy);
  };

  return (
    <button
      type="button"
      aria-label={rotulo}
      ref={ref}
      tabIndex={noTeclado ? 0 : -1}
      onKeyDown={teclar}
      style={{ cursor: CURSOR[borda] }}
      className={`group/alca absolute z-20 flex touch-none items-center justify-center rounded-full outline-none transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring ${POSICAO[borda]}`}
    >
      <span
        className={`rounded-full bg-primary/45 shadow-sm transition-[transform,background-color] duration-200 group-hover/alca:scale-125 group-hover/alca:bg-primary ${MARCA[borda]}`}
      />
    </button>
  );
}

/** Impede que clicar num controle dentro da alça (o card inteiro) comece um arraste (listener nativo). */
export function pararArraste(el: HTMLElement | null) {
  if (!el) return;
  const parar = (evento: Event) => evento.stopPropagation();
  el.addEventListener("pointerdown", parar);
  return () => el.removeEventListener("pointerdown", parar);
}
