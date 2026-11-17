"use server";

import { signOut, unstable_update } from "@/auth";
import { doctorFetch } from "@/modules/doctor/api";
import type { Text } from "@/modules/i18n/types";

const KNOWN: Record<string, string> = {
  plan_limit: "site.doctor.ssoLogin.error.planLimit",
  sso_inactive: "site.doctor.ssoLogin.error.inactive",
  sso_deactivated: "site.doctor.ssoLogin.error.deactivated",
  sso_no_group: "site.doctor.ssoLogin.error.noGroup",
};

/** Logo depois do login pelo IdP: a API cria ou ajusta o Vínculo pelo grupo do IdP e ativa a
 * Organização; a sessão é renovada para o token trazer as claims dela. */
export async function provisionSso(): Promise<Text | null> {
  const response = await doctorFetch("/sso/provision", { method: "POST" }).catch(() => null);
  if (!response) return { key: "site.doctor.error.offline" };
  if (!response.ok) {
    const { code } = (await response.json().catch(() => ({}))) as { code?: string };
    return { key: KNOWN[code ?? ""] ?? "site.doctor.ssoLogin.error.generic" };
  }
  const session = await unstable_update({ refresh: true } as Parameters<typeof unstable_update>[0]);
  return session?.accessToken ? null : { key: "site.doctor.org.renewFailed" };
}

/** Sair e voltar ao login (outra conta, ou a mesma por outro caminho). */
export async function signInAgain(locale: string): Promise<void> {
  await signOut({ redirectTo: `/${locale}/login?next=${encodeURIComponent(`/${locale}/doctor`)}` });
}
