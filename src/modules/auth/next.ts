/** Para onde voltar depois de entrar: só caminhos deste site (`/pt-BR/admin`),
 * nunca outro endereço (`//outro.site`, `https://...`). */
export function safeNext(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

/** Para onde ir depois de entrar quando ninguém pediu outro lugar: o painel. */
export function landingPath(locale: string) {
  return `/${locale}/dashboard`;
}
