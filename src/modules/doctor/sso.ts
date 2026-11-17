import type { Key } from "@/modules/i18n";

/** As regras de tela do SSO da Organização (Tela 23, #48; ADR-0021 do jayv-doctor). */

export const SSO_ROLES = ["admin", "analyst", "viewer"] as const;
export type SsoRole = (typeof SSO_ROLES)[number];
export const MAX_GROUPS = 100;
const MAX_GROUP_LENGTH = 200;
const DOMAIN = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

type Variant = "outline" | "warning" | "success" | "destructive";
const STATES: Record<string, { key: Key; variant: Variant }> = {
  pending_platform: { key: "site.doctor.sso.state.pending", variant: "warning" },
  active: { key: "site.doctor.sso.state.active", variant: "success" },
  error: { key: "site.doctor.sso.state.error", variant: "destructive" },
};

export function ssoState(connection: { status: string } | null): { key: Key; variant: Variant } {
  if (!connection) return { key: "site.doctor.sso.state.off", variant: "outline" };
  return STATES[connection.status] ?? STATES.error!;
}

export function validMetadataUrl(url: string): boolean {
  return url.length <= 500 && /^https:\/\/[^\s@]+$/.test(url);
}

/** Em minúsculas e sem o ponto final que alguns painéis de DNS mostram (`acme.com.`). */
export const normalizeDomain = (domain: string) => domain.trim().toLowerCase().replace(/\.$/, "");
export const validDomain = (domain: string) => domain.length <= 253 && DOMAIN.test(domain);

/** "Exigir SSO" sem domínio verificado deixaria a regra sem efeito: a API recusa. */
export function canRequireSso(domains: readonly { verified_at: string | null }[]): boolean {
  return domains.some((domain) => domain.verified_at !== null);
}

export type GroupRow = { group: string; role: SsoRole };

export function groupRows(groups: Record<string, SsoRole> | undefined | null): GroupRow[] {
  return Object.entries(groups ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([group, role]) => ({ group, role }));
}

export function groupsPayload(rows: readonly GroupRow[]):
  | { ok: true; groups: Record<string, SsoRole> }
  | { ok: false; index: number; reason: "duplicate" | "length" | "tooMany" } {
  const groups: Record<string, SsoRole> = {};
  let count = 0;
  for (const [index, row] of rows.entries()) {
    const group = row.group.trim();
    if (!group) continue;
    if (++count > MAX_GROUPS) return { ok: false, index, reason: "tooMany" };
    if (group.length > MAX_GROUP_LENGTH) return { ok: false, index, reason: "length" };
    if (Object.hasOwn(groups, group)) return { ok: false, index, reason: "duplicate" };
    groups[group] = row.role;
  }
  return { ok: true, groups };
}
