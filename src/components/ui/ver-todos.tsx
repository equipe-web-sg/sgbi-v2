"use client";

import Icon from "@mdi/react";
import { mdiArrowRight } from "@mdi/js";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";
import { LoadingOverlay } from "./loading-overlay";

/**
 * Botão "Ver todos" de um card com tabela: abre a tabela numa janela maior, para ver os dados em detalhe.
 * `filtros` são os controles da própria tabela (nível, busca, agrupamento, exportar...): o card passa o mesmo
 * elemento ao cabeçalho e aqui, então a janela compartilha o estado do card (alterar lá altera aqui).
 * Não inclui os filtros gerais da tela (período, filial).
 */
export function VerTodos({
  titulo,
  descricao,
  filtros,
  children,
  desabilitado,
  carregando = false,
  className = "max-w-6xl",
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  /** Os controles da tabela, repetidos no topo da janela. */
  filtros?: ReactNode;
  /** A tabela (o mesmo elemento do card). */
  children: ReactNode;
  desabilitado?: boolean;
  carregando?: boolean;
  /** Largura máxima da janela (classe `max-w-*`). */
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        disabled={desabilitado}
        className="flex shrink-0 items-center gap-1 rounded px-1 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring disabled:invisible"
      >
        Ver todos
        <Icon path={mdiArrowRight} size={0.55} aria-hidden />
      </DialogTrigger>
      <DialogContent titulo={titulo} descricao={descricao} className={className}>
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4">
          {filtros && <div className="flex flex-wrap items-center justify-between gap-2">{filtros}</div>}
          <div className="relative flex min-h-0 flex-1 flex-col" aria-busy={carregando}>
            <div className="min-h-0 flex-1 overflow-auto rounded-xl border">{children}</div>
            {/* z-20: acima do cabeçalho fixo (sticky) da tabela. */}
            <LoadingOverlay ativo={carregando} className="z-20 rounded-xl" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
