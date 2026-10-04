/** O cookie que guarda o verificador do PKCE enquanto o provedor está aberto
 * no vínculo de uma conta. Só o servidor lê (`httpOnly`). */
export const LINK_COOKIE = "jayv.link";

export interface LinkCookie { verifier: string; provider: string; locale: string }
