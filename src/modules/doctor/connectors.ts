import type { Key } from "@/modules/i18n";

/** As regras de tela dos Conectores (Tela 11) que não dependem de servidor nem de idioma. */

type Variant = "success" | "warning" | "destructive" | "secondary" | "outline";

/** `failing` volta a `active` sozinho na próxima Sincronização que der certo; `paused` espera
 * uma pessoa (docs/operations/conectores.md). */
export function connectorState(connector: { status: string; last_sync_at: string | null; paused_reason?: string | null }): { key: Key; variant: Variant } {
  if (connector.status === "failing") return { key: "site.doctor.connector.state.failing", variant: "warning" };
  if (connector.status === "paused") return { key: "site.doctor.connector.state.paused", variant: "secondary" };
  if (connector.status === "disabled") return { key: "site.doctor.connector.state.disabled", variant: "destructive" };
  // Limite diário da API do provedor: a coleta espera a janela seguinte sozinha.
  if (connector.paused_reason === "api_limit") return { key: "site.doctor.connector.state.limit", variant: "warning" };
  return connector.last_sync_at
    ? { key: "site.doctor.connector.state.healthy", variant: "success" }
    : { key: "site.doctor.connector.state.waiting", variant: "outline" };
}

/** Quanto falta (positivo) ou quanto passou (negativo), na maior unidade que cabe. */
export function relativeParts(instant: string, now: Date): { unit: "now" } | { unit: "minutes" | "hours" | "days"; count: number } {
  const minutes = Math.round((new Date(instant).getTime() - now.getTime()) / 60_000);
  const size = Math.abs(minutes);
  if (size < 1) return { unit: "now" };
  if (size < 60) return { unit: "minutes", count: minutes };
  if (size < 48 * 60) return { unit: "hours", count: Math.trunc(minutes / 60) };
  return { unit: "days", count: Math.trunc(minutes / (24 * 60)) };
}

/** O formato do Checkpoint é do provedor; o instante, quando há, é o que interessa a quem opera.
 * Salesforce (#37) tem um ponto por fonte: vale o mais recente. Sem instante, só "gravado". */
export function checkpointInstant(checkpoint: Record<string, unknown> | null | undefined): string | "saved" | null {
  if (!checkpoint) return null;
  const sources = checkpoint.sources && typeof checkpoint.sources === "object" ? Object.values(checkpoint.sources as Record<string, unknown>) : [];
  const latest = sources
    .map((mark) => (mark && typeof mark === "object" && typeof (mark as { at?: unknown }).at === "string" ? (mark as { at: string }).at : ""))
    .sort().at(-1);
  // GCP grava `timestamp`; SAP Integration Suite, `log_end`.
  const stamp = latest || checkpoint.timestamp || checkpoint.log_end;
  return typeof stamp === "string" && !Number.isNaN(Date.parse(stamp)) ? stamp : "saved";
}

export function pauseKey(reason: string | null | undefined): Key {
  if (reason === "auth") return "site.doctor.connector.pause.auth";
  if (reason === "api_limit") return "site.doctor.connector.pause.apiLimit";
  return "site.doctor.connector.pause.manual";
}

/** Intervalos oferecidos na tela; a API aceita de 60 s a 1 dia. */
export const INTERVALS = [60, 300, 900, 3600] as const;

export function intervalParts(seconds: number): { unit: "seconds" | "minutes" | "hours"; count: number } {
  if (seconds % 3600 === 0) return { unit: "hours", count: seconds / 3600 };
  return seconds % 60 === 0 ? { unit: "minutes", count: seconds / 60 } : { unit: "seconds", count: seconds };
}

/** O intervalo salvo pode não estar entre os oferecidos: entra na lista para não se perder. */
export function intervalOptions(current: number): number[] {
  return (INTERVALS as readonly number[]).includes(current) ? [...INTERVALS] : [...INTERVALS, current];
}

export function syncSeconds(startedAt: string, finishedAt: string | null): number | null {
  if (!finishedAt) return null;
  return Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000);
}

const SYNC: Record<string, { key: Key; variant: Variant }> = {
  succeeded: { key: "site.doctor.sync.succeeded", variant: "success" },
  failed: { key: "site.doctor.sync.failed", variant: "destructive" },
  running: { key: "site.doctor.sync.running", variant: "outline" },
};

export function syncStatus(status: string): { key: Key; variant: Variant } | { text: string; variant: Variant } {
  return SYNC[status] ?? { text: status, variant: "secondary" };
}

/** Conferência no navegador, só para avisar cedo: quem valida a chave de verdade é o Google. */
export function serviceAccountEmail(text: string): string | null {
  try {
    const key = JSON.parse(text) as unknown;
    if (typeof key !== "object" || key === null || Array.isArray(key)) return null;
    const { type, client_email, private_key } = key as Record<string, unknown>;
    if (type !== "service_account" || typeof private_key !== "string") return null;
    return typeof client_email === "string" ? client_email : null;
  } catch {
    return null;
  }
}

export type SalesforceAuth = "jwt_bearer" | "web_server";
export type SalesforceFields = { client_id: string; username: string; private_key: string; client_secret: string; refresh_token: string };

/** A credencial da Connected App: JWT Bearer (certificado) ou Web Server Flow (refresh token).
 * Incompleta, não sai. */
export function buildSalesforceCredential(auth: SalesforceAuth, fields: SalesforceFields): string | null {
  const id = fields.client_id.trim();
  if (auth === "jwt_bearer") {
    if (!id || !fields.username.trim() || !fields.private_key.includes("PRIVATE KEY")) return null;
    return JSON.stringify({ client_id: id, username: fields.username.trim(), private_key: fields.private_key.trim() });
  }
  if (!id || !fields.client_secret.trim() || !fields.refresh_token.trim()) return null;
  return JSON.stringify({ client_id: id, client_secret: fields.client_secret.trim(), refresh_token: fields.refresh_token.trim() });
}

/** SAP Integration Suite e OData leem a credencial como JSON (`json.loads` no Conector): estes
 * são os campos de cada um. OData usa Basic (`username`, `password`) ou OAuth (`client_id`,
 * `client_secret`), conforme o `auth` da config. Outro provedor recebe um texto. */
export function credentialFields(provider: string, auth: unknown): string[] | null {
  if (provider === "sap") return ["client_id", "client_secret"];
  if (provider === "odata") return auth === "basic" ? ["username", "password"] : ["client_id", "client_secret"];
  return null;
}

/** O JSON dos campos, só com todos preenchidos. */
export function pairCredential(names: readonly string[], values: Record<string, string>): string | null {
  const found: Record<string, string> = {};
  for (const name of names) {
    const value = (values[name] ?? "").trim();
    if (!value) return null;
    found[name] = value;
  }
  return JSON.stringify(found);
}
