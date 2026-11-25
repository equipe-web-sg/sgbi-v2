import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { filiaisQuery, getJson, STALE_TIME } from "@/lib/api";
import type { CompromissosResponse, FiltrosFinanceiro, MovimentosResponse, Periodo, PrazosResponse } from "./types";

const BASE = "/api/financeiro";
const get = <T,>(path: string, params: Record<string, string>) => getJson<T>(`${BASE}${path}`, params);
const filiais = (filtrosFinanceiro: FiltrosFinanceiro) => [...filtrosFinanceiro.filiais].sort((primeiro, segundo) => primeiro - segundo).join(",");

const comum = (filtrosFinanceiro: FiltrosFinanceiro, pronto: boolean) => ({
  staleTime: STALE_TIME,
  placeholderData: keepPreviousData,
  enabled: filtrosFinanceiro.filiais.length > 0 && pronto,
});

export const financeiroQueries = {
  filiais: filiaisQuery,

  movimentos: (filtrosFinanceiro: FiltrosFinanceiro, periodo: Periodo | null, referencia: string | null) => {
    const params = { filiais: filiais(filtrosFinanceiro), inicio: periodo?.inicio ?? "", fim: periodo?.fim ?? "", referencia: referencia ?? "" };
    return queryOptions({
      queryKey: ["financeiro", "movimentos", params],
      queryFn: () => get<MovimentosResponse>("/movimentos", params),
      ...comum(filtrosFinanceiro, !!periodo && !!referencia),
    });
  },

  compromissos: (filtrosFinanceiro: FiltrosFinanceiro, referencia: string | null, dias: number) => {
    const params = { filiais: filiais(filtrosFinanceiro), referencia: referencia ?? "", dias: String(dias) };
    return queryOptions({
      queryKey: ["financeiro", "compromissos", params],
      queryFn: () => get<CompromissosResponse>("/compromissos", params),
      ...comum(filtrosFinanceiro, !!referencia),
    });
  },

  prazos: (filtrosFinanceiro: FiltrosFinanceiro, periodo: Periodo | null) => {
    const params = { filiais: filiais(filtrosFinanceiro), inicio: periodo?.inicio ?? "", fim: periodo?.fim ?? "" };
    return queryOptions({
      queryKey: ["financeiro", "prazos", params],
      queryFn: () => get<PrazosResponse>("/prazos", params),
      ...comum(filtrosFinanceiro, !!periodo),
    });
  },
};
