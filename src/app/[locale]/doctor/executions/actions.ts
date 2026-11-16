"use server";

import { doctorFetch, doctorSearch, type Schemas } from "@/modules/doctor/api";
import { toExecutionSearch, type ExecutionFilters } from "@/modules/doctor/executions";

type ExecutionPage = Schemas["ExecutionPage"];

/** O termo vem no corpo da Server Action e segue no corpo para a API: nunca fica numa URL. */
export async function findExecutions(filters: ExecutionFilters, since: string, q: string | null, cursor: string | null): Promise<ExecutionPage | null> {
  return doctorSearch<ExecutionPage>("/executions/search", { ...toExecutionSearch(filters, new Date(since)), q: q?.trim() || null, cursor });
}

/** URL assinada de 5 min para o Log bruto; `null` sem permissão ou com o Log já vencido. */
export async function rawLogUrl(id: string): Promise<string | null> {
  const response = await doctorFetch(`/raw-logs/${encodeURIComponent(id)}/download`).catch(() => null);
  if (!response?.ok) return null;
  const { url } = (await response.json()) as { url: string };
  return url;
}
