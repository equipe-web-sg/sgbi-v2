"use client";

import Icon from "@mdi/react";
import { mdiDownload } from "@mdi/js";
import { Delta } from "@/components/kpi/kpi-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { VerTodos } from "@/components/ui/ver-todos";
import { baixarCsv } from "@/lib/csv";
import { formatMoeda, formatPercentual } from "@/lib/format";
import type { ListaProdutos, ProdutoResumo } from "../types";

/** Listas de variação mostram a Var. %; listas de margem mostram a margem. */
const TIPO: Record<ListaProdutos, "variacao" | "margem"> = {
  queda: "variacao",
  crescimento: "variacao",
  "maior-margem": "margem",
  "menor-margem": "margem",
};

function colunasProdutos(tipo: "variacao" | "margem", lista: ListaProdutos): Coluna<ProdutoResumo>[] {
  const venda: Coluna<ProdutoResumo> = { id: "venda", titulo: "Venda", cell: (produtoResumo) => formatMoeda(produtoResumo.venda), ordenar: (produtoResumo) => produtoResumo.venda };
  return [
    {
      id: "codigo",
      titulo: "Código",
      align: "left",
      className: "hidden text-muted-foreground @[24rem]:table-cell",
      cell: (produtoResumo) => produtoResumo.codigo,
      ordenar: (produtoResumo) => produtoResumo.codigo,
    },
    {
      id: "produto",
      titulo: "Produto",
      align: "left",
      // Nome longo: corta com reticências e mostra o nome completo no título.
      className: "w-full max-w-0 truncate",
      cell: (produtoResumo) => <span title={`${produtoResumo.codigo} · ${produtoResumo.descricao} · ${produtoResumo.departamento}`}>{produtoResumo.descricao}</span>,
      ordenar: (produtoResumo) => produtoResumo.descricao,
    },
    {
      id: "departamento",
      titulo: "Dep.",
      align: "left",
      className: "hidden max-w-24 truncate text-muted-foreground @[26rem]:table-cell",
      cell: (produtoResumo) => <span title={produtoResumo.departamento}>{produtoResumo.departamento}</span>,
      ordenar: (produtoResumo) => produtoResumo.departamento,
    },
    ...(tipo === "variacao"
      ? [
          venda,
          {
            id: "variacao",
            titulo: "Var. %",
            cell: (produtoResumo: ProdutoResumo) => <Delta value={produtoResumo.variacao} unidade="%" maiorMelhor />,
            ordenar: (produtoResumo: ProdutoResumo) => produtoResumo.variacao,
          },
        ]
      : [
          {
            id: "margem",
            titulo: "Margem",
            cell: (produtoResumo: ProdutoResumo) => (
              <span className={`font-semibold ${lista === "maior-margem" ? "text-success" : "text-error"}`}>
                {formatPercentual(produtoResumo.margem)}
              </span>
            ),
            ordenar: (produtoResumo: ProdutoResumo) => produtoResumo.margem,
          },
          venda,
        ]),
  ];
}

function Tabela({ produtos, lista, compacta }: { produtos: ProdutoResumo[]; lista: ListaProdutos; compacta?: boolean }) {
  return (
    <DataTable
      colunas={colunasProdutos(TIPO[lista], lista)}
      linhas={produtos}
      chave={(produtoResumo) => String(produtoResumo.codigo)}
      densidade="compacto"
      cabecalhoFixo={!compacta}
      vazio={null}
    />
  );
}

export function ProdutosLista({
  titulo,
  descricao,
  lista,
  produtos,
  carregando,
}: {
  titulo: string;
  /** Explica o critério da lista (tooltip e janela "Ver todos"). */
  descricao: string;
  lista: ListaProdutos;
  produtos: ProdutoResumo[] | undefined;
  carregando: boolean;
}) {
  const todos = produtos ?? [];
  const exportar = () =>
    baixarCsv(
      `${titulo.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.csv`,
      ["Código", "Produto", "Departamento", "Classe", "Venda (R$)", "Venda anterior (R$)", "Var. (%)", "Lucro bruto (R$)", "Margem (%)"],
      todos.map((produtoResumo) => [produtoResumo.codigo, produtoResumo.descricao, produtoResumo.departamento, produtoResumo.classe, produtoResumo.venda, produtoResumo.vendaAnterior, produtoResumo.variacao, produtoResumo.lucro, produtoResumo.margem]),
    );

  const controles = (
    <>
      <span className="text-xs text-muted-foreground">{todos.length} produtos</span>
      <button
        type="button"
        onClick={exportar}
        disabled={!todos.length}
        className="flex h-8 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-xs font-medium text-foreground shadow-xs hover:border-primary/60 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
      >
        <Icon path={mdiDownload} size={0.65} aria-hidden />
        Exportar
      </button>
    </>
  );

  return (
    <Card className="@container min-w-0">
      <CardHeader className="flex-nowrap!">
        <CardTitle className="min-w-0 truncate text-sm" title={descricao}>
          {titulo}
        </CardTitle>
        <VerTodos titulo={titulo} descricao={descricao} filtros={controles} desabilitado={!todos.length} className="max-w-3xl">
          <div className="@container">
            <Tabela produtos={todos} lista={lista} />
          </div>
        </VerTodos>
      </CardHeader>
      {/* A tabela rola dentro do card: ao aumentar o card, aparecem mais produtos. */}
      <div className="relative flex min-h-0 flex-1 flex-col px-3 pb-3 pt-1.5" aria-busy={carregando}>
        <div className="min-h-0 overflow-auto rounded-lg border">
          <Tabela produtos={todos} lista={lista} compacta />
          {!carregando && !todos.length && (
            <p className="py-6 text-center text-xs text-muted-foreground">Nenhum produto no período.</p>
          )}
        </div>
        <LoadingOverlay ativo={carregando} label={titulo} className="rounded-b-2xl" />
      </div>
    </Card>
  );
}
