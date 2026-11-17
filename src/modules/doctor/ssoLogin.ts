import { callbackPath, safeNext } from "@/modules/auth/next";

/** O login pelo SSO da Organização (#48, ADR-0021 do jayv-doctor): o IdP devolve ao callback do
 * site, que troca o código pela sessão e segue para o provisionamento do Doctor (Vínculo pelo
 * grupo do IdP), e só então para onde a pessoa ia. */
export function ssoReturnPath(locale: string, next: string): string {
  return callbackPath(locale, provisionPath(locale, next));
}

/** A página que cria o Vínculo pelo grupo do IdP, com o destino. */
export function provisionPath(locale: string, next: string): string {
  return `/${locale}/doctor/sso/provision?next=${encodeURIComponent(next)}`;
}

/** Para onde ir depois do provisionamento: um caminho do site, ou o painel do Doctor. */
export function provisionNext(locale: string, next: string | null | undefined): string {
  return safeNext(next, `/${locale}/doctor`);
}
