"use server";

import { signOut, unstable_update } from "@/auth";
import { sendToDoctor } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

/** Aceita o convite e renova a sessão: as claims só trazem a Organização nova num token novo. */
export async function acceptInvitation(token: string): Promise<Text | null> {
  const failed = await sendToDoctor("/invitations/accept", { method: "POST", body: JSON.stringify({ token }) }, {
    revalidate: "/[locale]/doctor",
    layout: true,
    known: {
      invitation_email_mismatch: "site.doctor.invite.error.mismatch",
      invitation_gone: "site.doctor.invite.error.gone",
    },
  });
  if (failed) return failed;
  const session = await unstable_update({ refresh: true } as Parameters<typeof unstable_update>[0]);
  return session?.accessToken ? null : { key: "site.doctor.org.renewFailed" };
}

/** "Entrar com outro e-mail": encerra a sessão e volta ao login, que depois traz de volta ao
 * aceite (o token fica guardado no navegador). */
export async function signInAsOther(locale: string): Promise<void> {
  await signOut({ redirectTo: `/${locale}/login?next=${encodeURIComponent(`/${locale}/doctor/invitations/accept`)}` });
}
