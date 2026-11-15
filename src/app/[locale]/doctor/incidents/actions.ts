"use server";

import { doctorSearch, type Schemas } from "@/modules/doctor/api";
import { sendToDoctor } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

type IncidentPage = Schemas["IncidentPage"];
type Status = Schemas["IncidentSummary"]["status"];
type Severity = Schemas["IncidentSummary"]["severity"];

export interface IncidentFilters { status: Status[]; severity: Severity[] }

const KNOWN = {
  invalid_transition: "site.doctor.incident.error.transition",
  invalid_assignee: "site.doctor.incident.error.assignee",
};

/** A busca vai no corpo (POST): o termo pode ser um nº de pedido e não vai para a URL nem log. */
export async function findIncidents(filters: IncidentFilters, q: string | null, cursor: string | null): Promise<IncidentPage | null> {
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
    revalidate: "/[locale]/doctor/incidents/[id]", known: KNOWN, invalid: "site.doctor.incident.error.resolutionNote",
  });
}

export async function addComment(id: string, body: string): Promise<Text | null> {
  return sendToDoctor(`/incidents/${encodeURIComponent(id)}/comments`, { method: "POST", body: JSON.stringify({ body_md: body, mentions: [] }) }, {
    revalidate: "/[locale]/doctor/incidents/[id]", invalid: "site.doctor.incident.error.comment",
  });
}
