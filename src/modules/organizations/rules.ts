/** As regras de organização que o painel usa, iguais às do app
 * (`src/modules/organizations/rules.ts` do jayv-coder) e às RPCs — o banco
 * confere de novo em cada gravação. */
export type Role = "owner" | "maintainer" | "member";
export const INVITE_ROLES: Exclude<Role, "owner">[] = ["maintainer", "member"];

export const isRole = (value: unknown): value is Role => value === "owner" || value === "maintainer" || value === "member";

export const SLUG_MAX = 40;

/** A mesma regra de `organizations.slug`: 3 a 40 caracteres, minúsculas,
 * dígitos e `-`, começando e terminando em letra ou dígito. */
export const slugOk = (slug: string) => /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug);

/** O slug sugerido a partir do nome: sem acento, o resto vira `-`. */
export function slugify(name: string) {
  return name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, SLUG_MAX).replace(/-+$/, "");
}

/** Convidar e mudar a política é de owner e maintainer. */
export const canManage = (role: Role | undefined) => role === "owner" || role === "maintainer";

/** Excluir a organização é só do owner. */
export const canDelete = (role: Role | undefined) => role === "owner";

/** As RPCs de organização falham com uma chave do i18n (`org.forbidden`,
 * `policy.invalid`); o resto segue como motivo técnico. */
export function orgFailure(error: { message?: string }) {
  if (error.message && /^(org|policy)\.[A-Za-z]+$/.test(error.message)) return { key: error.message };
  return error.message ?? "unknown";
}
