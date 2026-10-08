import type { Key } from "@/modules/i18n";

/** As notificações da conta: as mesmas linhas de `public.notifications` que o
 * app lê, então ler uma aqui a marca como lida lá também. As deste aparelho
 * (resposta pronta, pergunta do agente, cota, atualização) nunca chegam ao
 * banco e só existem no app. */
export const ACCOUNT_KINDS = ["org.invited", "org.inviteAccepted", "org.inviteDeclined", "org.roleChanged", "org.removed", "org.deleted", "org.policyChanged"] as const;
export type NotificationKind = (typeof ACCOUNT_KINDS)[number];

export type NotificationData = Record<string, unknown>;

export interface SiteNotification {
  id: string;
  kind: NotificationKind;
  data: NotificationData;
  createdAt: string;
  read: boolean;
}

/** Quantas o sino traz de uma vez, como o app. */
export const NOTIFICATION_LIMIT = 100;

export const isAccountKind = (kind: unknown): kind is NotificationKind => (ACCOUNT_KINDS as readonly unknown[]).includes(kind);

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Uma linha do banco; nula para um tipo que o site não conhece (um tipo novo
 * do app não quebra a lista). */
export function fromRow(row: { id: string; kind: string; data: unknown; created_at: string; read_at: string | null }): SiteNotification | null {
  if (!isAccountKind(row.kind)) return null;
  const data = row.data && typeof row.data === "object" && !Array.isArray(row.data) ? (row.data as NotificationData) : {};
  return { id: row.id, kind: row.kind, data, createdAt: row.created_at, read: row.read_at !== null };
}

/** A frase (chave e parâmetros) e a linha de baixo, quando há quem fez. */
export function describe(notification: SiteNotification): { title: Key; params: Record<string, string>; byKey: Key | null; by: string } {
  const { kind, data } = notification;
  const user = text(data.user);
  const params = { org: text(data.org), role: text(data.role), user: user ? `@${user}` : "", repository: text(data.repository) };
  const title = (kind === "org.policyChanged" && params.repository ? "notifications.org.repositoryPolicyChanged" : `notifications.${kind}`) as Key;
  const hasBy = kind === "org.invited" || kind === "org.roleChanged" || kind === "org.removed" || kind === "org.deleted" || kind === "org.policyChanged";
  return { title, params, byKey: hasBy && user ? "notifications.by" : null, by: params.user };
}

/** Onde a notificação leva no painel: a organização, ou a lista delas quando
 * não há para onde ir direto (convite, ou organização que já não existe). */
export function targetOf(notification: SiteNotification): string | null {
  const { kind, data } = notification;
  if (kind === "org.removed" || kind === "org.deleted") return null;
  if (kind === "org.invited") return "/dashboard/organizations";
  const id = text(data.orgId);
  return id ? `/dashboard/organizations/${id}` : null;
}

export type Tone = "go" | "ask" | "stop" | "info";

/** O semáforo do app: pede ação é âmbar, deu errado é vermelho, ficou pronto é verde. */
export function toneOf(kind: NotificationKind): Tone {
  switch (kind) {
    case "org.inviteAccepted": return "go";
    case "org.invited": return "ask";
    case "org.removed": case "org.deleted": case "org.inviteDeclined": return "stop";
    default: return "info";
  }
}

export const newestFirst = (list: SiteNotification[]) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [["day", 86_400], ["hour", 3_600], ["minute", 60]];

/** "há 5 min", "ontem": quanto tempo faz, no idioma da tela. */
export function timeAgo(iso: string, locale: string, now = Date.now()) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  for (const [unit, size] of UNITS) if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  return format.format(0, "second");
}
