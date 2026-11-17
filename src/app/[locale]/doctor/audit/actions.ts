"use server";

import { doctorFetch, type Schemas } from "@/modules/doctor/api";
import { readCategory } from "@/modules/doctor/audit";

type AuditPage = Schemas["AuditPage"];

/** A Trilha de auditoria, com os filtros no corpo: o termo pode ser o e-mail de alguém e não vai
 * para a URL nem para o log. `forbidden`: só Owner e Admin com MFA leem a trilha. */
export async function findAudit(category: string | null, q: string | null, cursor: string | null): Promise<AuditPage | "forbidden" | null> {
  const known = readCategory(category);
  const response = await doctorFetch("/audit-logs/search", {
    method: "POST",
    body: JSON.stringify({ limit: 50, ...(known && { category: known }), ...(q?.trim() && { q: q.trim() }), ...(cursor && { cursor }) }),
  }).catch(() => null);
  if (response?.status === 403) return "forbidden";
  return response?.ok ? ((await response.json()) as AuditPage) : null;
}
