"use server";

import { doctorGet, type Schemas } from "@/modules/doctor/api";
import { sendForResult, sendToDoctor } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

type Report = Schemas["Report"];
type Created = Schemas["ReportShareCreated"];

const PAGE = "/[locale]/doctor/incidents/[id]/report";
const KNOWN = { report_not_ready: "site.doctor.report.error.notReady" };

/** A chave nasce no navegador: clique duplo ou repetição da rede devolvem o mesmo relatório. */
export async function createReport(
  incident: string, body: { format: "pdf" | "md"; include_timeline: boolean; include_event_excerpts: boolean }, key: string,
): Promise<{ ok: true; value: { report_id: string } } | { ok: false; error: Text }> {
  return sendForResult(`/incidents/${encodeURIComponent(incident)}/reports`, { method: "POST", body: JSON.stringify(body) }, { key, known: KNOWN });
}

export async function reportStatus(id: string): Promise<string | null> {
  const found = await doctorGet<Report>(`/reports/${encodeURIComponent(id)}`);
  return found && found !== "not_found" ? found.status : null;
}

/** O link do relatório: a URL só aparece nesta resposta, então a tela a mostra uma vez. */
export async function shareReport(report: string): Promise<{ ok: true; value: Created } | { ok: false; error: Text }> {
  return sendForResult(`/reports/${encodeURIComponent(report)}/shares`, { method: "POST" }, { revalidate: PAGE, known: KNOWN });
}

/** Revogar corta o acesso na hora (ADR-0014). */
export async function revokeShare(report: string, share: string): Promise<Text | null> {
  return sendToDoctor(`/reports/${encodeURIComponent(report)}/shares/${encodeURIComponent(share)}`, { method: "DELETE" }, { revalidate: PAGE });
}
