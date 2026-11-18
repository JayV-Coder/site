/** Para onde voltar depois de entrar: só caminhos deste site (`/pt-BR/admin`),
 * nunca outro endereço (`//outro.site`, `https://...`). */
export function safeNext(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

/** A volta de um login fora do site (provedor, link do e-mail, IdP do SSO): o callback troca o
 * código pela sessão e segue para `next`. */
export function callbackPath(locale: string, next: string) {
  return `/${locale}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Para onde ir depois de entrar quando ninguém pediu outro lugar: o painel. */
export function landingPath(locale: string) {
  return `/${locale}/dashboard`;
}
