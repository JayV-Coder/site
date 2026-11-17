"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { forgetPendingInvitation, pendingInvitation, savePendingInvitation } from "@/modules/doctor/members";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { acceptInvitation, signInAsOther } from "./actions";

/** O token chega no `#` do link; some do endereço assim que é lido (não fica em histórico nem
 * em Referer) e fica no navegador até o aceite. */
function readToken(): string | null {
  const fromLink = window.location.hash.slice(1);
  if (!fromLink) return pendingInvitation();
  savePendingInvitation(fromLink);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return fromLink;
}

export function AcceptInvitation({ locale, signedIn }: { locale: string; signedIn: boolean }) {
  const t = useT();
  const say = useSay();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const accept = useKeyedAction();
  useEffect(() => { setToken(readToken()); }, []);
  const here = `/${locale}/doctor/invitations/accept`;

  return (
    <section aria-labelledby="doctor-invite-title" className="grid gap-4">
      <h1 id="doctor-invite-title" className="text-xl font-semibold">{t("site.doctor.invite.title")}</h1>
      {accept.error && <p role="alert" className="text-sm text-destructive">{say(accept.error)}</p>}
      {token === null && !accept.error && <p role="alert" className="text-sm text-destructive">{t("site.doctor.invite.incomplete")}</p>}
      {token && !signedIn && (
        <>
          <p className="text-sm text-muted-foreground">{t("site.doctor.invite.signIn")}</p>
          <div><Button asChild><Link href={`/${locale}/login?next=${encodeURIComponent(here)}`}>{t("site.doctor.invite.signInButton")}</Link></Button></div>
        </>
      )}
      {token && signedIn && (
        <div><Button loading={accept.busy} onClick={() => accept.run((key) => { void key; return acceptInvitation(token); }, () => { forgetPendingInvitation(); window.location.assign(`/${locale}/doctor`); })}>{t("site.doctor.invite.accept")}</Button></div>
      )}
      {signedIn && (
        <form action={() => signInAsOther(locale)}><Button type="submit" variant="outline">{t("site.doctor.invite.otherEmail")}</Button></form>
      )}
    </section>
  );
}
