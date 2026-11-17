/** Membros e Convites do Doctor: as regras de tela, sem React, para testar. */

/** Os Papéis que se convidam; só o Owner convida outro Owner. */
export const INVITE_ROLES = ["analyst", "viewer", "admin"] as const;

export function inviteRoles(viewerRole: string): readonly string[] {
  return viewerRole === "owner" ? [...INVITE_ROLES, "owner"] : INVITE_ROLES;
}

/** Dias que faltam para o convite expirar (arredonda para cima); zero ou menos é expirado. */
export function daysLeft(expiresAt: string, now: Date = new Date()): number {
  return Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000);
}

/** Outro Owner só muda pelas mãos de um Owner: Admin vê o Papel, mas não o altera nem remove. */
export const isLocked = (memberRole: string, viewerRole: string): boolean => memberRole === "owner" && viewerRole !== "owner";

/** Onde o navegador guarda o token do convite: o link do e-mail pode abrir em outra aba e o
 * login nem sempre volta ao aceite. Sai no aceite. Sem storage, basta abrir de novo o link. */
const PENDING_KEY = "doctor-pending-invitation";

export function savePendingInvitation(token: string): void {
  try { window.localStorage.setItem(PENDING_KEY, token); } catch { /* sem storage: abrir o link de novo */ }
}
export function pendingInvitation(): string | null {
  try { return window.localStorage.getItem(PENDING_KEY); } catch { return null; }
}
export function forgetPendingInvitation(): void {
  try { window.localStorage.removeItem(PENDING_KEY); } catch { /* idem */ }
}
