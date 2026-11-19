"use server";

import { doctorSearch, type Schemas } from "@/modules/doctor/api";
import { readCursor, writeCursor, type Cursor } from "@/modules/doctor/cursor";
import { doctorRead } from "@/modules/doctor/read";
import { sendToDoctor } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

type IncidentPage = Schemas["IncidentPage"];
type Status = Schemas["IncidentSummary"]["status"];
type Severity = Schemas["IncidentSummary"]["severity"];

export interface IncidentFilters { status: Status[]; severity: Severity[] }

const DETAIL = "/[locale]/doctor/incidents/[id]";

const KNOWN = {
  invalid_transition: "site.doctor.incident.error.transition",
  invalid_assignee: "site.doctor.incident.error.assignee",
};

/** A busca vai no corpo (POST): o termo pode ser um nº de pedido e não vai para a URL nem log. */
export async function findIncidents(filters: IncidentFilters, q: string | null, cursor: string | null): Promise<IncidentPage | null> {
  // Sem termo de busca, direto no Supabase (`doctor_read.incidents`, ADR-0026). A busca por texto
  // precisa do HMAC da Referência de negócio, que só a API tem. O cursor é o mesmo nos dois
  // caminhos: sem a leitura direta, a API serve a mesma página.
  const after = readCursor(cursor);
  if (!q?.trim() && (cursor === null || after !== null)) {
    const direct = await doctorRead<{ items: IncidentPage["items"]; next_cursor: Cursor | null; counts: IncidentPage["counts"] }>("incidents", {
      status: filters.status.length > 0 ? filters.status : null,
      severity: filters.severity.length > 0 ? filters.severity : null,
      cursor_at: after?.at ?? null,
      cursor_id: after?.id ?? null,
    });
    if (direct.ok) return { ...direct.value, next_cursor: direct.value.next_cursor ? writeCursor(direct.value.next_cursor) : null };
  }
  return doctorSearch<IncidentPage>("/incidents/search", {
    status: filters.status.length > 0 ? filters.status : null,
    severity: filters.severity.length > 0 ? filters.severity : null,
    q: q?.trim() || null,
    cursor,
  });
}

export async function changeIncident(
  id: string,
  change: { status?: Status; severity?: Severity; assignee_id?: string | null; resolution_note?: string },
): Promise<Text | null> {
  return sendToDoctor(`/incidents/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(change) }, {
    revalidate: DETAIL, known: KNOWN, invalid: "site.doctor.incident.error.resolutionNote",
  });
}

export async function addComment(id: string, body: string): Promise<Text | null> {
  return sendToDoctor(`/incidents/${encodeURIComponent(id)}/comments`, { method: "POST", body: JSON.stringify({ body_md: body, mentions: [] }) }, {
    revalidate: DETAIL, invalid: "site.doctor.incident.error.comment",
  });
}

/** Cria a versão N+1 do Diagnóstico; o progresso aparece no card. A chave de idempotência faz
 * a repetição depois de uma resposta perdida devolver o mesmo Diagnóstico. */
export async function requestDiagnosis(
  id: string, body: { mode: "hybrid" | "rules_only"; include_knowledge_base: boolean }, key: string,
): Promise<Text | null> {
  return sendToDoctor(`/incidents/${encodeURIComponent(id)}/diagnoses`, { method: "POST", body: JSON.stringify(body) }, {
    revalidate: DETAIL, key, invalid: "site.doctor.diagnosis.error.mode",
    known: { idempotency_conflict: "site.doctor.diagnosis.error.idempotency" },
  });
}

export type Review =
  | { verdict: "accepted" }
  | { verdict: "rejected"; comment?: string }
  | { verdict: "corrected"; correct_category?: string; correct_cause?: string; responsible_system?: string; comment?: string };

/** Revisão humana (#26): uma por revisor e versão; o banco confere de novo. */
export async function reviewDiagnosis(diagnosisId: string, review: Review, key: string): Promise<Text | null> {
  return sendToDoctor(`/diagnoses/${encodeURIComponent(diagnosisId)}/feedback`, { method: "POST", body: JSON.stringify(review) }, {
    revalidate: DETAIL, key,
    // Na correção, o que falha na validação é faltar a categoria ou a causa; no resto, o genérico.
    invalid: review.verdict === "corrected" ? "site.doctor.review.error.correction" : undefined,
    known: {
      correction_required: "site.doctor.review.error.correction",
      already_reviewed: "site.doctor.review.error.already",
      superseded: "site.doctor.review.error.superseded",
      not_reviewable: "site.doctor.review.error.notReviewable",
    },
  });
}

/** Incidente resolvido com Diagnóstico aceito ou corrigido: o caso vai para a Base de conhecimento. */
export async function promoteIncident(id: string, key: string): Promise<Text | null> {
  return sendToDoctor(`/incidents/${encodeURIComponent(id)}/knowledge`, { method: "POST" }, {
    revalidate: DETAIL, key,
    known: {
      already_promoted: "site.doctor.promote.error.already",
      not_resolved: "site.doctor.promote.error.notResolved",
      not_reviewed: "site.doctor.promote.error.notReviewed",
    },
  });
}

/** Abre o chamado no ITSM (uma vez por Incidente e provedor); a chave aparece quando o ITSM responde. */
export async function openTicket(id: string, provider: "jira" | "servicenow", key: string): Promise<Text | null> {
  return sendToDoctor(`/incidents/${encodeURIComponent(id)}/tickets?provider=${provider}`, { method: "POST" }, {
    revalidate: DETAIL, key, known: { itsm_not_configured: "site.doctor.ticket.error.notConfigured" },
  });
}
