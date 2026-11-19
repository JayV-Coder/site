"use server";

import { doctorFetch, doctorSearch, type Schemas } from "@/modules/doctor/api";
import { readCursor, writeCursor, type Cursor } from "@/modules/doctor/cursor";
import { readExecutionFilters, toExecutionSearch, type ExecutionFilters } from "@/modules/doctor/executions";
import { doctorRead } from "@/modules/doctor/read";

type ExecutionPage = Schemas["ExecutionPage"];

/** O termo vem no corpo da Server Action e segue no corpo para a API: nunca fica numa URL. */
export async function findExecutions(filters: ExecutionFilters, since: string, q: string | null, cursor: string | null): Promise<ExecutionPage | null> {
  // A Server Action é chamável de fora: os filtros passam pela mesma validação do endereço.
  const safe = readExecutionFilters({ ...filters });
  const start = Number.isNaN(Date.parse(since)) ? new Date() : new Date(since);
  const search = toExecutionSearch(safe, start);
  const term = typeof q === "string" ? q.trim() || null : null;
  // Sem termo, direto no Supabase (`doctor_read.executions`, ADR-0026 do jayv-doctor). A busca por
  // texto precisa do HMAC da Referência de negócio, que só a API tem. O cursor é o mesmo nos dois.
  const after = readCursor(cursor);
  if (!term && (cursor === null || after !== null)) {
    const direct = await doctorRead<{ items: ExecutionPage["items"]; next_cursor: Cursor | null }>("executions", {
      status: search.status,
      integration: search.integration_id,
      environment: search.environment,
      since: search.from,
      cursor_at: after?.at ?? null,
      cursor_id: after?.id ?? null,
      lim: search.limit,
    });
    if (direct.ok) return { items: direct.value.items, next_cursor: direct.value.next_cursor ? writeCursor(direct.value.next_cursor) : null };
  }
  return doctorSearch<ExecutionPage>("/executions/search", { ...search, q: term, cursor });
}

/** URL assinada de 5 min para o Log bruto; `null` sem permissão ou com o Log já vencido. */
export async function rawLogUrl(id: string): Promise<string | null> {
  const response = await doctorFetch(`/raw-logs/${encodeURIComponent(id)}/download`).catch(() => null);
  if (!response?.ok) return null;
  const { url } = (await response.json()) as { url: string };
  return url;
}
