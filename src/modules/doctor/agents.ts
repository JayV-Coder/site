import type { Key } from "@/modules/i18n";

/** As regras de tela dos agentes locais (#39): coleta no SAP on-premises, só com conexões de saída. */

type Variant = "success" | "warning" | "destructive" | "outline";

/** O agente manda sinal de vida a cada rodada (5 min por padrão): três rodadas sem sinal já é
 * motivo para olhar a máquina do cliente. */
const SILENT_MS = 15 * 60_000;

export function agentState(
  agent: { status: string; last_seen_at: string | null; registration_expires_at: string | null }, now: Date,
): { key: Key; variant: Variant } {
  if (agent.status === "revoked") return { key: "site.doctor.agent.state.revoked", variant: "destructive" };
  if (agent.status === "pending") {
    return agent.registration_expires_at && new Date(agent.registration_expires_at) > now
      ? { key: "site.doctor.agent.state.pending", variant: "outline" }
      : { key: "site.doctor.agent.state.expired", variant: "warning" };
  }
  return agent.last_seen_at && now.getTime() - new Date(agent.last_seen_at).getTime() <= SILENT_MS
    ? { key: "site.doctor.agent.state.connected", variant: "success" }
    : { key: "site.doctor.agent.state.silent", variant: "warning" };
}

export type Collection = { kind: "directory" | "table" | "function"; value: string };

export function agentCollections(config: { collections?: unknown }): Collection[] {
  const items = Array.isArray(config.collections) ? (config.collections as Record<string, unknown>[]) : [];
  return items.map((item) => {
    if (item.type === "directory") return { kind: "directory" as const, value: String(item.path) };
    if (item.type === "rfc_table") return { kind: "table" as const, value: String(item.table) };
    return { kind: "function" as const, value: String(item.name) };
  });
}

export type CollectionDraft = { directory: string; pattern: string; idoc: boolean; fn: string };

/** Só o que está marcado é coletado: a allowlist do agente (docs/api/agents.md). */
export function buildCollections(draft: CollectionDraft): Record<string, string>[] {
  const found: Record<string, string>[] = [];
  const folder = draft.directory.trim();
  if (folder) found.push({ type: "directory", path: folder, pattern: draft.pattern.trim() || "*.csv" });
  if (draft.idoc) found.push({ type: "rfc_table", table: "EDIDS" });
  const fn = draft.fn.trim();
  if (fn) found.push({ type: "rfc_function", name: fn });
  return found;
}

export const validPath = (value: string) => value.trim() === "" || value.trim().startsWith("/");
const FUNCTION = /^Z_AID_[A-Z0-9_]{1,24}$/;
export const validFunction = (value: string) => value.trim() === "" || FUNCTION.test(value.trim());
