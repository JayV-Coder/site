"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FormField } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authFailure } from "@/modules/auth/errors";
import { nextStep, useHandoff } from "@/modules/auth/handoff";
import { useFeedback } from "@/modules/feedback";
import { useHref, useLocale, useT } from "@/modules/i18n";
import { browserSupabase } from "@/modules/supabase/browser";
import { AuthShell } from "./AuthShell";
import { ProviderButtons } from "./ProviderButtons";
import { SecondFactorForm } from "./SecondFactorForm";

type Mode = "signIn" | "reset" | "secondFactor";

/** Entrar no site com a mesma conta do app: e-mail e senha, ou um provedor,
 * e o código do app autenticador quando a conta tem um. */
export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const t = useT();
  const href = useHref();
  const locale = useLocale();
  const handoff = useHandoff();
  const { report } = useFeedback();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(notice ?? "");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNote("");
    try {
      const supabase = browserSupabase();
      if (mode === "reset") {
        const redirectTo = `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(`/${locale}/new-password`)}`;
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (error) throw authFailure(error);
        setMode("signIn");
        setNote(t("auth.resetSent"));
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw authFailure(error);
      if ((await nextStep()) === "secondFactor") setMode("secondFactor");
      else await handoff(next, data.session);
    } catch (error) {
      report(error);
    } finally {
      setBusy(false);
    }
  };

  if (mode === "secondFactor") {
    return <SecondFactorForm email={email} onVerified={() => handoff(next)} onCancel={() => { setPassword(""); setMode("signIn"); }} />;
  }

  const reset = mode === "reset";
  return (
    <AuthShell title={reset ? t("auth.reset.title") : t("auth.title")} subtitle={reset ? t("auth.reset.description") : t("auth.subtitle")}>
      <form onSubmit={submit} className="grid gap-4">
        <FormField label={t("auth.email")} htmlFor="login-email">
          <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </FormField>
        {!reset && (
          <FormField label={t("auth.password")} htmlFor="login-password">
            <Input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </FormField>
        )}
        {!reset && (
          <button type="button" className="justify-self-end text-xs text-muted-foreground hover:text-foreground" onClick={() => { setMode("reset"); setNote(""); }}>
            {t("auth.forgot")}
          </button>
        )}
        {note && <p role="status" className="text-xs text-muted-foreground">{note}</p>}
        <Button type="submit" loading={busy}>{reset ? t("auth.reset.send") : t("auth.signIn")}</Button>
      </form>
      {!reset && <ProviderButtons next={next} disabled={busy} />}
      {reset
        ? <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setMode("signIn")}>{t("auth.backToSignIn")}</button>
        : <Link href={`${href("/register")}${next !== href("/") ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-center text-xs text-muted-foreground hover:text-foreground">{t("auth.toSignUp")}</Link>}
    </AuthShell>
  );
}
