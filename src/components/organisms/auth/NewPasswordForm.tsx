"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormField, PasswordRules } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authFailure } from "@/modules/auth/errors";
import { nextStep, useHandoff } from "@/modules/auth/handoff";
import { passwordOk } from "@/modules/auth/password";
import { useFeedback } from "@/modules/feedback";
import { useHref, useT } from "@/modules/i18n";
import { browserSupabase, forgetBrowserSession } from "@/modules/supabase/browser";
import { AuthShell } from "./AuthShell";
import { SecondFactorForm } from "./SecondFactorForm";

/** Aberta pelo link de recuperação: a sessão está no navegador, falta a
 * senha nova. Com app autenticador, o código vem antes (o Supabase só troca a
 * senha em `aal2`). Cancelar descarta a sessão, para o link não virar uma
 * porta aberta. */
export function NewPasswordForm() {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const handoff = useHandoff();
  const { notify, report } = useFeedback();
  const [state, setState] = useState<"checking" | "missing" | "secondFactor" | "ready">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  // A conta da sessão aberta pelo link, à vista: a senha nova é dela.
  const [email, setEmail] = useState<string | null>(null);
  const mismatch = confirm.length > 0 && confirm !== password;

  useEffect(() => {
    void (async () => {
      const { data } = await browserSupabase().auth.getSession();
      setEmail(data.session?.user.email ?? null);
      if (!data.session) setState("missing");
      else setState((await nextStep()) === "secondFactor" ? "secondFactor" : "ready");
    })();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await browserSupabase().auth.updateUser({ password });
      if (error) throw authFailure(error);
      notify(t("auth.newPassword.saved"));
      await handoff(href("/"));
    } catch (error) {
      report(error);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    await browserSupabase().auth.signOut({ scope: "local" }).catch(() => {});
    forgetBrowserSession();
    router.replace(href("/login"));
  };

  if (state === "checking") return null;
  if (state === "secondFactor") return <SecondFactorForm onVerified={async () => setState("ready")} onCancel={() => router.replace(href("/login"))} />;
  if (state === "missing") {
    return (
      <AuthShell title={t("auth.newPassword.title")}>
        <p role="alert" className="text-center text-sm text-muted-foreground">{t("site.callback.failed")}</p>
        <Button asChild variant="outline"><Link href={href("/login")}>{t("auth.backToSignIn")}</Link></Button>
      </AuthShell>
    );
  }
  return (
    <AuthShell title={t("auth.newPassword.title")} subtitle={t("auth.newPassword.description")}>
      <form onSubmit={submit} className="grid gap-4">
        {email && <p className="text-center font-mono text-sm break-all">{email}</p>}
        <FormField label={t("security.new")} htmlFor="recover-password">
          <Input id="recover-password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </FormField>
        <PasswordRules password={password} />
        <FormField label={t("security.confirm")} htmlFor="recover-confirm" error={mismatch ? t("auth.mismatch") : null}>
          <Input id="recover-confirm" type="password" autoComplete="new-password" required aria-invalid={mismatch || undefined} value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        </FormField>
        <Button type="submit" loading={busy} disabled={!passwordOk(password) || confirm !== password}>{t("auth.newPassword.save")}</Button>
        <Button type="button" variant="ghost" onClick={() => void cancel()}>{t("common.cancel")}</Button>
      </form>
    </AuthShell>
  );
}
