"use client";

import { useState, type FormEvent } from "react";
import { FormField } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifySecondFactor } from "@/modules/auth/handoff";
import { TOTP_LENGTH, totpDigits, totpOk } from "@/modules/auth/mfa";
import { useFeedback } from "@/modules/feedback";
import { useT } from "@/modules/i18n";
import { browserSupabase, forgetBrowserSession } from "@/modules/supabase/browser";
import { AuthShell } from "./AuthShell";

/** Depois da senha ou do provedor, quando a conta tem app autenticador: o
 * site só abre com o código, como o app. "Outra conta" descarta a sessão pela
 * metade. */
export function SecondFactorForm({ email, onVerified, onCancel }: { email?: string | null; onVerified: () => Promise<void>; onCancel: () => void }) {
  const t = useT();
  const { report } = useFeedback();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!totpOk(code)) return;
    setBusy(true);
    try {
      await verifySecondFactor(code);
      await onVerified();
    } catch (error) {
      setCode("");
      report(error);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    await browserSupabase().auth.signOut({ scope: "local" }).catch(() => {});
    forgetBrowserSession();
    onCancel();
  };

  return (
    <AuthShell title={t("auth.secondFactor.title")} subtitle={t("auth.secondFactor.description")}>
      <form onSubmit={submit} className="grid gap-4">
        <FormField label={t("auth.secondFactor.code")} htmlFor="second-factor-code" hint={email ?? undefined}>
          <Input id="second-factor-code" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={TOTP_LENGTH} className="text-center font-mono tracking-[0.4em]" value={code} onChange={(event) => setCode(totpDigits(event.target.value))} />
        </FormField>
        <Button type="submit" loading={busy} disabled={!totpOk(code)}>{t("auth.secondFactor.verify")}</Button>
        <Button type="button" variant="ghost" onClick={() => void cancel()}>{t("auth.secondFactor.other")}</Button>
      </form>
    </AuthShell>
  );
}
