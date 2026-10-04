"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, PasswordRules, SettingsSection } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { codeDigits, codeOk } from "@/modules/auth/code";
import { secretGroups, TOTP_LENGTH, totpDigits, totpOk } from "@/modules/auth/mfa";
import { passwordOk } from "@/modules/auth/password";
import { useFeedback } from "@/modules/feedback";
import { useT } from "@/modules/i18n";
import {
  cancelTotp, changePassword, confirmTotp, enrollTotp, removeTotp, sendSetPasswordCode, setFirstPassword, type ActionResult,
} from "./actions";

/** O que as duas seções fazem depois de cada ação: avisa, ou mostra o erro e
 * para; e relê a página para a conta aparecer como ficou. */
function useRunner() {
  const router = useRouter();
  const { notify, report } = useFeedback();
  const [busy, startBusy] = useTransition();
  const run = <T,>(action: () => Promise<ActionResult<T>>, onDone?: (data: T) => void, done?: string) => startBusy(async () => {
    const result = await action();
    if (!result.ok) {
      report(result.error);
      return;
    }
    if (done) notify(done);
    onDone?.(result.data);
    router.refresh();
  });
  return { busy, run };
}

/** A senha e o app autenticador, trazidos da aba Segurança do app. */
export function SecuritySection({ email, hasPassword, totpFactorId }: { email: string | null; hasPassword: boolean; totpFactorId: string | null }) {
  return (
    <div className="grid gap-5">
      <PasswordPanel email={email} hasPassword={hasPassword} askTotp={hasPassword && totpFactorId !== null} />
      <TwoFactorPanel enabled={totpFactorId !== null} />
    </div>
  );
}

/** Quem já tem senha troca informando a atual (e, com o app autenticador, o
 * código dele); quem entrou só por provedor define a primeira com o código
 * que vai ao e-mail. */
function PasswordPanel({ email, hasPassword, askTotp }: { email: string | null; hasPassword: boolean; askTotp: boolean }) {
  const t = useT();
  const { busy, run } = useRunner();
  const [current, setCurrent] = useState("");
  const [code, setCode] = useState("");
  const [totp, setTotp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = passwordOk(password) && confirm === password && (hasPassword ? current.length > 0 && (!askTotp || totpOk(totp)) : codeOk(code));

  const reset = () => {
    setCurrent("");
    setCode("");
    setTotp("");
    setCodeSent(false);
    setPassword("");
    setConfirm("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    if (hasPassword) run(() => changePassword(current, password, askTotp ? totp : undefined), reset, t("security.changed"));
    else run(() => setFirstPassword(code, password), reset, t("security.set"));
  };

  const sendCode = () => run(() => sendSetPasswordCode(), () => setCodeSent(true));

  return (
    <SettingsSection title={t("security.title")} description={t("security.description")}>
      {!hasPassword && !codeSent ? (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">{t("security.noPassword")}</p>
          <Button type="button" variant="outline" className="justify-self-start" loading={busy} disabled={!email} onClick={sendCode}>{t("security.sendCode")}</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          {hasPassword ? (
            <FormField label={t("security.current")} htmlFor="security-current">
              <Input id="security-current" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
            </FormField>
          ) : (
            <FormField label={t("security.code")} htmlFor="security-code" hint={t("security.codeSent", { email: email ?? "" })}>
              <Input id="security-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(codeDigits(event.target.value))} />
            </FormField>
          )}
          {askTotp && (
            <FormField label={t("security.totp")} htmlFor="security-totp">
              <Input id="security-totp" inputMode="numeric" autoComplete="one-time-code" maxLength={TOTP_LENGTH} className="font-mono tracking-[0.3em]" value={totp} onChange={(event) => setTotp(totpDigits(event.target.value))} />
            </FormField>
          )}
          <FormField label={t("security.new")} htmlFor="security-new">
            <Input id="security-new" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </FormField>
          <PasswordRules password={password} />
          <FormField label={t("security.confirm")} htmlFor="security-confirm" error={mismatch ? t("auth.mismatch") : null}>
            <Input id="security-confirm" type="password" autoComplete="new-password" aria-invalid={mismatch || undefined} value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </FormField>
          <div className="flex flex-wrap justify-end gap-2">
            {!hasPassword && <Button type="button" variant="ghost" disabled={busy} onClick={sendCode}>{t("security.sendCode")}</Button>}
            <Button type="submit" loading={busy} disabled={!ready}>{hasPassword ? t("security.change") : t("security.setPassword")}</Button>
          </div>
        </form>
      )}
    </SettingsSection>
  );
}

interface Enrollment { factorId: string; qrCode: string; secret: string }

/** O segundo fator: um app autenticador (TOTP). Ligar mostra o QR code e só
 * vale depois do primeiro código; desligar pede um código atual. */
function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const t = useT();
  const { report } = useFeedback();
  const { busy, run } = useRunner();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [removing, setRemoving] = useState(false);
  const [code, setCode] = useState("");

  const start = () => run(() => enrollTotp(), (data) => { setCode(""); setEnrollment(data); });

  const cancel = () => {
    const pending = enrollment;
    setEnrollment(null);
    setRemoving(false);
    setCode("");
    if (pending) void cancelTotp(pending.factorId).then((result) => { if (!result.ok) report(result.error); });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!totpOk(code)) return;
    if (enrollment) run(() => confirmTotp(enrollment.factorId, code), () => { setEnrollment(null); setCode(""); }, t("twoFactor.enabled"));
    else run(() => removeTotp(code), () => { setRemoving(false); setCode(""); }, t("twoFactor.removed"));
  };

  const codeField = (
    <FormField label={t("twoFactor.code")} htmlFor="two-factor-code" hint={removing ? t("twoFactor.removeHint") : undefined}>
      <Input id="two-factor-code" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={TOTP_LENGTH} className="max-w-40 font-mono tracking-[0.3em]" value={code} onChange={(event) => setCode(totpDigits(event.target.value))} />
    </FormField>
  );

  return (
    <SettingsSection
      title={t("twoFactor.title")}
      description={t("twoFactor.description")}
      action={<Badge variant={enabled ? "success" : "secondary"}>{enabled ? t("twoFactor.badge.on") : t("twoFactor.badge.off")}</Badge>}
    >
      {enrollment ? (
        <form onSubmit={submit} className="grid gap-4">
          <p className="text-sm text-muted-foreground">{t("twoFactor.scan")}</p>
          <div className="flex flex-wrap items-start gap-5">
            {/* Fundo branco fixo: o leitor de QR não lê o código no tema escuro. */}
            <div className="rounded-md bg-white p-3">
              {/* O SVG vem pronto do Supabase como data URI. */}
              <img src={enrollment.qrCode} alt="" width={168} height={168} />
            </div>
            <div className="grid min-w-0 flex-1 gap-4">
              <div className="grid gap-1.5">
                <p className="text-xs text-muted-foreground">{t("twoFactor.secret")}</p>
                <code className="select-all break-all rounded-md border border-border/60 px-3 py-2 font-mono text-sm">{secretGroups(enrollment.secret)}</code>
              </div>
              {codeField}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("twoFactor.warning")}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" disabled={busy} onClick={cancel}>{t("common.cancel")}</Button>
            <Button type="submit" loading={busy} disabled={!totpOk(code)}>{t("twoFactor.confirm")}</Button>
          </div>
        </form>
      ) : enabled ? (
        removing ? (
          <form onSubmit={submit} className="grid gap-4">
            {codeField}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" disabled={busy} onClick={cancel}>{t("common.cancel")}</Button>
              <Button type="submit" variant="destructive" loading={busy} disabled={!totpOk(code)}>{t("twoFactor.remove")}</Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{t("twoFactor.on")}</p>
            <Button type="button" variant="outline" disabled={busy} onClick={() => { setCode(""); setRemoving(true); }}>{t("twoFactor.remove")}</Button>
          </div>
        )
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("twoFactor.off")}</p>
          <Button type="button" loading={busy} onClick={start}>{t("twoFactor.enable")}</Button>
        </div>
      )}
    </SettingsSection>
  );
}
