import type { Key } from "@/modules/i18n";
import { incidentCode } from "./labels";

/** Os rótulos do relatório técnico (Tela 19) e dos chamados no ITSM (#43 Jira, #44 ServiceNow)
 * que não dependem de servidor nem de idioma. */

export type Provider = "jira" | "servicenow";

const FORMATS: Record<string, string> = { pdf: "PDF", md: "Markdown" };
const PROVIDERS: Record<string, string> = { jira: "Jira", servicenow: "ServiceNow" };

export const formatName = (format: string) => FORMATS[format] ?? format;
export const providerName = (provider: string) => PROVIDERS[provider] ?? provider;

export function reportState(status: string): "generating" | "ready" | "failed" {
  if (status === "ready") return "ready";
  return status === "failed" ? "failed" : "generating";
}

export function downloadName(number: number, format: string): string {
  return `${incidentCode(number).toLowerCase()}.${format}`;
}

/** A linha do chamado: a chave e o status vêm do ITSM e não se traduzem. */
export function ticketLine(ticket: {
  status: string; external_key: string | null; external_status: string | null; error: string | null;
}): { text: string } | { key: Key; error?: string } {
  if (ticket.status === "creating") return { key: "site.doctor.ticket.creating" };
  if (ticket.status === "failed") return { key: "site.doctor.ticket.failed", ...(ticket.error && { error: ticket.error }) };
  return { text: [ticket.external_key, ticket.external_status].filter(Boolean).join(" · ") };
}

export function ticketBadge(status: string): "destructive" | "success" | "secondary" {
  if (status === "failed") return "destructive";
  return status === "done" ? "success" : "secondary";
}

/** Os provedores que aparecem no Incidente: os que já têm chamado e os conectados de verdade
 * (Jira com projeto, ServiceNow com instância). Só os conectados abrem chamado. A conexão vem
 * nula sem conexão e indefinida quando a API não respondeu. */
export function ticketProviders(
  tickets: readonly { provider: string }[],
  jira: { status: string; project_key: string | null } | null | undefined,
  servicenow: { status: string; instance_url: string | null } | null | undefined,
): { provider: Provider; canOpen: boolean }[] {
  const connected = new Set<Provider>();
  if (jira?.status === "active" && jira.project_key) connected.add("jira");
  if (servicenow?.status === "active" && servicenow.instance_url) connected.add("servicenow");
  const shown = new Set<Provider>();
  for (const ticket of tickets) if (ticket.provider === "jira" || ticket.provider === "servicenow") shown.add(ticket.provider);
  for (const provider of connected) shown.add(provider);
  return [...shown].map((provider) => ({ provider, canOpen: connected.has(provider) }));
}
