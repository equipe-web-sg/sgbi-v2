"use client";

import {
  mdiBullseyeArrow,
  mdiCartOutline,
  mdiCartRemove,
  mdiChartBar,
  mdiCubeOutline,
  mdiFinance,
  mdiOfficeBuildingOutline,
  mdiPercentOutline,
  mdiSackOutline,
  mdiTagOutline,
} from "@mdi/js";
import { diferencaPp, indicadores, percentual, serieDiaria, variacao, type Indicadores } from "../compute";
import { formatMoeda, formatPercentual } from "@/lib/format";
import type { Fonte, MetaResponse, ResumoResponse } from "../types";
import { corDoTom, Delta, KpiCard, SemDados } from "@/components/kpi/kpi-card";
import { Sparkline } from "@/components/kpi/sparkline";

function Vs({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap tabular-nums">vs {children}</span>;
}

/** Variação + valor anterior, ou aviso quando o período de comparação não tem carga. */
function Comparativo({ temAnterior, children }: { temAnterior: boolean; children: React.ReactNode }) {
  return temAnterior ? children : <span>sem dados no período anterior</span>;
}

export type ItemKpi = { id: string; titulo: string; node: React.ReactNode };

/**
 * Os KPIs do Painel (venda, lucro, margem, despesas, resultado, meta, ticket,
 * compra sobre venda, cancelamentos e descontos), na ordem padrão. O bloco de
 * KPIs da grade personalizável (`BlocoKpis`) monta a grade deles.
 */
export function kpisDoPainel({
  resumo,
  meta,
  carregando,
}: {
  resumo: ResumoResponse | undefined;
  meta: MetaResponse | undefined;
  /** Fontes ainda carregando: cada card espera só as fontes que usa. */
  carregando: Record<Fonte | "meta", boolean>;
}) {
  const dias = resumo?.atual.dias ?? [];
  const atual: Indicadores = indicadores(dias);
  const anterior: Indicadores = indicadores(resumo?.anterior.dias ?? []);
  const carregandoKpis = carregando;

  // Venda zerada (ex.: origem Faturamento sem notas) conta como "sem dados".
  const temVenda = atual.cobertura.venda > 0 && atual.venda !== 0;
  const temPdv = atual.cobertura.vendaPdv > 0;
  const temDespesas = atual.cobertura.despesas > 0;
  const temDespesasAnterior = anterior.cobertura.despesas > 0;
  const temVendaAnterior = anterior.cobertura.venda > 0 && anterior.venda !== 0;
  const temPdvAnterior = anterior.cobertura.tickets > 0;
  const temCancelAnterior = anterior.cobertura.cancelamentos > 0;

  const atingido = meta && meta.metaPeriodo ? percentual(atual.venda, meta.metaPeriodo) : null;

  return [
    {
      id: "venda",
      titulo: "Venda",
      node: (
        <KpiCard
          titulo="Venda"
          ajuda="Soma da venda (PDV e/ou faturamento, conforme a Origem) no período."
          icone={mdiChartBar}
          tom="green"
          carregando={carregandoKpis.vendas}
          valor={temVenda ? formatMoeda(atual.venda) : <SemDados>Sem dados no período</SemDados>}
          linhas={
            temVenda && (
              <>
                <Comparativo temAnterior={temVendaAnterior}>
                  <Delta value={variacao(atual.venda, anterior.venda)} unidade="%" maiorMelhor />
                  <Vs>{formatMoeda(anterior.venda)}</Vs>
                </Comparativo>
              </>
            )
          }
          grafico={
            <Sparkline
              label="Venda"
              kind="bar"
              color={corDoTom("green")}
              format={formatMoeda}
              data={serieDiaria(dias, (indicador) => indicador.venda, "venda")}
            />
          }
        />
      ),
    },
    {
      id: "lucro-bruto",
      titulo: "Lucro Bruto",
      node: (
        <KpiCard
          titulo="Lucro Bruto"
          ajuda="Venda menos o custo da mercadoria vendida."
          icone={mdiSackOutline}
          tom="gold"
          carregando={carregandoKpis.vendas}
          valor={temVenda ? formatMoeda(atual.lucro) : <SemDados>Sem dados no período</SemDados>}
          linhas={
            temVenda && (
              <>
                <Comparativo temAnterior={temVendaAnterior}>
                  <Delta value={variacao(atual.lucro, anterior.lucro)} unidade="%" maiorMelhor />
                  <Vs>{formatMoeda(anterior.lucro)}</Vs>
                </Comparativo>
              </>
            )
          }
          grafico={
            <Sparkline
              label="Lucro Bruto"
              kind="bar"
              color={corDoTom("gold")}
              format={formatMoeda}
              data={serieDiaria(dias, (indicador) => indicador.lucro, "venda")}
            />
          }
        />
      ),
    },
    {
      id: "margem-bruta",
      titulo: "Margem Bruta",
      node: (
        <KpiCard
          titulo="Margem Bruta"
          ajuda="Lucro bruto dividido pela venda. Variação em pontos percentuais."
          icone={mdiPercentOutline}
          tom="pink"
          carregando={carregandoKpis.vendas}
          valor={atual.margem != null ? formatPercentual(atual.margem) : <SemDados>Sem dados no período</SemDados>}
          linhas={
            atual.margem != null && (
              <>
                <Comparativo temAnterior={temVendaAnterior}>
                  <Delta value={diferencaPp(atual.margem, anterior.margem)} unidade="pp" maiorMelhor />
                  <Vs>{formatPercentual(anterior.margem)}</Vs>
                </Comparativo>
              </>
            )
          }
          grafico={
            <Sparkline
              label="Margem Bruta"
              kind="area"
              color={corDoTom("pink")}
              format={formatPercentual}
              data={serieDiaria(dias, (indicador) => indicador.margem, "venda")}
            />
          }
        />
      ),
    },
    {
      id: "despesas-operacionais",
      titulo: "Despesas Operacionais",
      node: (
        <KpiCard
          titulo="Despesas Operacionais"
          linhasLongas
          ajuda="Soma das despesas lançadas no período (tabela despesa)."
          icone={mdiOfficeBuildingOutline}
          tom="blue"
          carregando={carregandoKpis.despesas || carregandoKpis.vendas}
          valor={temDespesas ? formatMoeda(atual.despesas) : <SemDados>Sem despesas no período</SemDados>}
          linhas={
            temDespesas && (
              <>
                <span className="tabular-nums">{formatPercentual(atual.despesasSobreVenda)} da venda</span>
                {temDespesasAnterior ? (
                  <Delta
                    value={diferencaPp(atual.despesasSobreVenda, anterior.despesasSobreVenda)}
                    unidade="pp"
                    maiorMelhor={false}
                  />
                ) : (
                  <span>sem despesas no período anterior</span>
                )}
              </>
            )
          }
          grafico={
            <Sparkline
              label="Despesas Operacionais"
              kind="bar"
              color={corDoTom("blue")}
              format={formatMoeda}
              data={serieDiaria(dias, (indicador) => indicador.despesas, "despesas")}
            />
          }
        />
      ),
    },
    {
      id: "resultado-operacional",
      titulo: "Resultado Operacional",
      node: (
        <KpiCard
          titulo="Resultado Operacional"
          linhasLongas
          ajuda="Lucro bruto menos as despesas operacionais."
          icone={mdiFinance}
          tom="purple"
          carregando={carregandoKpis.vendas || carregandoKpis.despesas}
          valor={temVenda && temDespesas ? formatMoeda(atual.resultado) : <SemDados>Sem despesas no período</SemDados>}
          linhas={
            temVenda &&
            temDespesas && (
              <>
                <span className="tabular-nums">{formatPercentual(atual.resultadoSobreVenda)} da venda</span>
                {temDespesasAnterior && temVendaAnterior ? (
                  <Delta value={variacao(atual.resultado, anterior.resultado)} unidade="%" maiorMelhor />
                ) : (
                  <span>sem despesas no período anterior</span>
                )}
              </>
            )
          }
        />
      ),
    },
    {
      id: "venda-vs-meta",
      titulo: "Venda vs Meta",
      node: (
        <KpiCard
          titulo="Venda vs Meta"
          ajuda="Venda do período dividida pela meta (previsão de venda por dia) do mesmo período."
          icone={mdiBullseyeArrow}
          tom="teal"
          carregando={carregandoKpis.meta || carregandoKpis.vendas}
          valor={atingido != null ? formatMoeda(atual.venda) : <SemDados>Meta não cadastrada</SemDados>}
          linhas={
            atingido != null &&
            meta && (
              <>
                <span className="font-semibold text-foreground tabular-nums">{formatPercentual(atingido)} da meta</span>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(atingido, 100)}%` }} />
                </div>
                <span className="tabular-nums">Meta: {formatMoeda(meta.metaPeriodo)}</span>
              </>
            )
          }
        />
      ),
    },
    {
      id: "ticket-medio",
      titulo: "Ticket Médio",
      node: (
        <KpiCard
          titulo="Ticket Médio"
          ajuda="Venda do PDV dividida pela quantidade de cupons (logpdv, mesma base da tela de Vendas). Não usa o filtro de Origem."
          icone={mdiCartOutline}
          tom="orange"
          badge="PDV"
          carregando={carregandoKpis.pdv}
          valor={atual.ticketMedio != null ? formatMoeda(atual.ticketMedio) : <SemDados>Sem dados no período</SemDados>}
          linhas={
            atual.ticketMedio != null && (
              <>
                <Comparativo temAnterior={temPdvAnterior}>
                  <Delta value={variacao(atual.ticketMedio, anterior.ticketMedio)} unidade="%" maiorMelhor />
                  <Vs>{formatMoeda(anterior.ticketMedio)}</Vs>
                </Comparativo>
              </>
            )
          }
          grafico={
            <Sparkline
              label="Ticket Médio"
              kind="area"
              color={corDoTom("orange")}
              format={formatMoeda}
              data={serieDiaria(dias, (indicador) => indicador.ticketMedio, "tickets")}
            />
          }
        />
      ),
    },
    {
      id: "compra-sobre-venda",
      titulo: "Compra sobre Venda",
      node: (
        <KpiCard
          titulo="Compra sobre Venda"
          ajuda="Total comprado dividido pela venda do período. Quanto menor, melhor."
          icone={mdiCubeOutline}
          tom="blue"
          carregando={carregandoKpis.vendas}
          valor={
            atual.compraSobreVenda != null ? (
              formatPercentual(atual.compraSobreVenda)
            ) : (
              <SemDados>Sem dados no período</SemDados>
            )
          }
          linhas={
            atual.compraSobreVenda != null && (
              <>
                <Comparativo temAnterior={temVendaAnterior}>
                  <Delta value={diferencaPp(atual.compraSobreVenda, anterior.compraSobreVenda)} unidade="pp" maiorMelhor={false} />
                  <Vs>{formatPercentual(anterior.compraSobreVenda)}</Vs>
                </Comparativo>
              </>
            )
          }
          grafico={
            <Sparkline
              label="Compra sobre Venda"
              kind="area"
              color={corDoTom("blue")}
              format={formatPercentual}
              data={serieDiaria(dias, (indicador) => indicador.compraSobreVenda, "venda")}
            />
          }
        />
      ),
    },
    {
      id: "cancelamentos",
      titulo: "Cancelamentos",
      node: (
        <KpiCard
          titulo="Cancelamentos"
          linhasLongas
          ajuda="Valor cancelado no PDV (tabela cancelamentos), sobre a venda do PDV."
          icone={mdiCartRemove}
          tom="coral"
          badge="PDV"
          carregando={carregandoKpis.cancelamentos || carregandoKpis.pdv}
          valor={atual.cobertura.cancelamentos ? formatMoeda(atual.cancelamentos) : <SemDados>Sem dados no período</SemDados>}
          linhas={
            atual.cobertura.cancelamentos > 0 && (
              <>
                {temPdv && (
                  <span className="tabular-nums">{formatPercentual(atual.cancelamentosSobreVenda)} da venda PDV</span>
                )}
                <Comparativo temAnterior={temCancelAnterior}>
                  <span className="flex flex-wrap items-center gap-x-2">
                    <Delta value={variacao(atual.cancelamentos, anterior.cancelamentos)} unidade="%" maiorMelhor={false} />
                    <Vs>{formatMoeda(anterior.cancelamentos)}</Vs>
                  </span>
                </Comparativo>
              </>
            )
          }
          grafico={
            <Sparkline
              label="Cancelamentos"
              kind="area"
              color={corDoTom("coral")}
              format={formatMoeda}
              data={serieDiaria(dias, (indicador) => indicador.cancelamentos, "cancelamentos")}
            />
          }
        />
      ),
    },
    {
      id: "descontos",
      titulo: "Descontos",
      node: (
        <KpiCard
          titulo="Descontos"
          ajuda="Cálculo em definição (decisão adiada): a soma de descontos no logpdv leva cerca de 34 s por mês."
          icone={mdiTagOutline}
          tom="gold"
          badge="PDV"
          valor={<SemDados>Em definição</SemDados>}
          linhas={<span>Venda bruta = venda + descontos</span>}
        />
      ),
    },
  ];
}
