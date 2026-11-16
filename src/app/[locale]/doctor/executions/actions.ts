"use server";

import { doctorFetch, doctorSearch, type Schemas } from "@/modules/doctor/api";
import { readExecutionFilters, toExecutionSearch, type ExecutionFilters } from "@/modules/doctor/executions";

type ExecutionPage = Schemas["ExecutionPage"];

/** O termo vem no corpo da Server Action e segue no corpo para a API: nunca fica numa URL. */
export async function findExecutions(filters: ExecutionFilters, since: string, q: string | null, cursor: string | null): Promise<ExecutionPage | null> {
  // A Server Action é chamável de fora: os filtros passam pela mesma validação do endereço.
  const safe = readExecutionFilters({ ...filters });
  const start = Number.isNaN(Date.parse(since)) ? new Date() : new Date(since);
  return doctorSearch<ExecutionPage>("/executions/search", { ...toExecutionSearch(safe, start), q: typeof q === "string" ? q.trim() || null : null, cursor });
}

/** URL assinada de 5 min para o Log bruto; `null` sem permissão ou com o Log já vencido. */
export async function rawLogUrl(id: string): Promise<string | null> {
  const response = await doctorFetch(`/raw-logs/${encodeURIComponent(id)}/download`).catch(() => null);
  if (!response?.ok) return null;
  const { url } = (await response.json()) as { url: string };
  return url;
}
