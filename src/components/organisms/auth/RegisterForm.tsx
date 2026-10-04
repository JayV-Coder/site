"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FormField, PasswordRules } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authFailure } from "@/modules/auth/errors";
import { useHandoff } from "@/modules/auth/handoff";
import { passwordOk } from "@/modules/auth/password";
import { DISPLAY_NAME_MAX } from "@/modules/profile/fields";
import { useFeedback } from "@/modules/feedback";
import { useHref, useLocale, useT } from "@/modules/i18n";
import { browserSupabase } from "@/modules/supabase/browser";
import { AuthShell } from "./AuthShell";
import { ProviderButtons } from "./ProviderButtons";

/** O cadastro, que morava na porta do app: e-mail, nome e senha (com as
 * mesmas regras), ou um provedor. O nome vai nos metadados e o banco o copia
 * para o perfil, como antes. A confirmação por e-mail volta para este site. */
export function RegisterForm({ next }: { next: string }) {
  const t = useT();
  const href = useHref();
  const locale = useLocale();
  const handoff = useHandoff();
  const { report } = useFeedback();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = passwordOk(password) && confirm === password && name.trim().length > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    try {
      const emailRedirectTo = `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(next)}`;
      const { data, error } = await browserSupabase().auth.signUp({ email: email.trim(), password, options: { emailRedirectTo, data: { display_name: name.trim() } } });
      if (error) throw authFailure(error);
      // Sem confirmação de e-mail no projeto, a sessão já vem pronta.
      if (data.session) await handoff(next, data.session);
      else setSent(true);
    } catch (error) {
      report(error);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthShell title={t("site.register.title")}>
        <p role="status" className="text-center text-sm text-muted-foreground">{t("auth.checkEmail")}</p>
        <Button asChild variant="outline"><Link href={href("/login")}>{t("auth.toSignIn")}</Link></Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("site.register.title")} subtitle={t("site.register.subtitle")}>
      <form onSubmit={submit} className="grid gap-4">
        <FormField label={t("auth.email")} htmlFor="register-email">
          <Input id="register-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </FormField>
        <FormField label={t("auth.displayName")} htmlFor="register-name">
          <Input id="register-name" autoComplete="nickname" required maxLength={DISPLAY_NAME_MAX} value={name} onChange={(event) => setName(event.target.value)} />
        </FormField>
        <FormField label={t("auth.password")} htmlFor="register-password">
          <Input id="register-password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </FormField>
        <PasswordRules password={password} />
        <FormField label={t("auth.confirmPassword")} htmlFor="register-confirm" error={mismatch ? t("auth.mismatch") : null}>
          <Input id="register-confirm" type="password" autoComplete="new-password" required aria-invalid={mismatch || undefined} value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        </FormField>
        <Button type="submit" loading={busy} disabled={!ready}>{t("auth.signUp")}</Button>
      </form>
      <ProviderButtons next={next} disabled={busy} />
      <Link href={href("/login")} className="text-center text-xs text-muted-foreground hover:text-foreground">{t("auth.toSignIn")}</Link>
    </AuthShell>
  );
}
