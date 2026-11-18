"use server";

import { signOut } from "@/auth";
import { doctorFetch } from "@/modules/doctor/api";
import { failureText, renewSession } from "@/modules/doctor/session";
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
  if (!response?.ok) return failureText(response, KNOWN, "site.doctor.ssoLogin.error.generic");
  return renewSession();
}

/** Sair e voltar ao login (outra conta, ou a mesma por outro caminho), mantendo o destino. */
export async function signInAgain(locale: string, next: string): Promise<void> {
  await signOut({ redirectTo: `/${locale}/login?next=${encodeURIComponent(next)}` });
}
