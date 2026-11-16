"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormField, OptionSelect } from "@/components/molecules";
import { Input } from "@/components/ui/input";
import type { Schemas } from "@/modules/doctor/api";
import { intervalOptions, intervalParts } from "@/modules/doctor/connectors";
import { useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { editConnector, replaceCredential, runConnectorAction, testSavedConnection } from "./actions";
import { CredentialField } from "./CredentialField";

type TestResult = Schemas["TestResult"];
const OFFLINE: Text = { key: "site.doctor.error.offline" };

/** Sincronizar, pausar ou retomar. O aviso de pedido feito some sozinho; o status de verdade
 * chega quando a página redesenha. */
export function ConnectorAction({ id, action, primary = false }: { id: string; action: "sync" | "pause" | "resume"; primary?: boolean }) {
  const t = useT();
  const say = useSay();
  const [error, setError] = useState<Text | null>(null);
  const [done, setDone] = useState(false);
  const [busy, startBusy] = useTransition();
  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => setDone(false), 6000);
    return () => window.clearTimeout(timer);
  }, [done]);
  return (
    <div className="grid gap-1">
      <Button variant={primary ? "default" : "outline"} size="sm" loading={busy} onClick={() => startBusy(async () => {
        const failed = await runConnectorAction(id, action).catch(() => OFFLINE);
        setError(failed);
        setDone(failed === null && action === "sync");
      })}>{t(`site.doctor.connector.action.${action}`)}</Button>
      {error && <p role="alert" className="text-xs text-destructive">{say(error)}</p>}
      {done && <p role="status" className="text-xs text-muted-foreground">{t("site.doctor.connector.syncRequested")}</p>}
    </div>
  );
}

/** Testar a conexão de um Conector salvo: a credencial vai de novo, só para este teste. */
export function TestConnection({ id, name, provider, primary = false }: { id: string; name: string; provider: string; primary?: boolean }) {
  const t = useT();
  const say = useSay();
  const [open, setOpen] = useState(false);
  const [credential, setCredential] = useState<string | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<Text | null>(null);
  const [busy, startBusy] = useTransition();
  return (
    <Dialog open={open} onOpenChange={(next) => { if (busy) return; setOpen(next); if (!next) { setCredential(null); setResult(null); setError(null); } }}>
      <DialogTrigger asChild><Button variant={primary ? "default" : "outline"} size="sm">{t("site.doctor.connector.test")}</Button></DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{t("site.doctor.connector.testTitle", { name })}</DialogTitle>
          <DialogDescription>{t("site.doctor.connector.testHint")}</DialogDescription>
        </DialogHeader>
        {/* A cada abertura o campo nasce de novo: a chave escolhida antes não fica. */}
        {open && <CredentialField provider={provider} onChange={(value) => { setCredential(value); setResult(null); }} />}
        {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
        {result && (
          <div role={result.ok ? "status" : "alert"} className={result.ok ? "rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm" : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm"}>
            <p className="font-medium">{t(result.ok ? "site.doctor.connector.testOk" : "site.doctor.connector.testFailed")}</p>
            {/* O texto do provedor vem da API como está. */}
            <p className="mt-1 text-xs break-words">{result.message}</p>
          </div>
        )}
        <DialogFooter>
          <Button loading={busy} disabled={credential === null} onClick={() => startBusy(async () => {
            if (credential === null) return;
            const outcome = await testSavedConnection(id, credential).catch(() => ({ ok: false as const, error: OFFLINE }));
            if (outcome.ok) { setResult(outcome.value); setError(null); } else { setError(outcome.error); setResult(null); }
          })}>{t("site.doctor.connector.testRun")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CredentialDialog({ id, provider }: { id: string; provider: string }) {
  const t = useT();
  const say = useSay();
  const [open, setOpen] = useState(false);
  const [credential, setCredential] = useState<string | null>(null);
  const [error, setError] = useState<Text | null>(null);
  const [busy, startBusy] = useTransition();
  return (
    <Dialog open={open} onOpenChange={(next) => { if (busy) return; setOpen(next); if (!next) { setCredential(null); setError(null); } }}>
      <DialogTrigger asChild><Button variant="outline" size="sm">{t("site.doctor.connector.credential")}</Button></DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{t("site.doctor.connector.credential")}</DialogTitle>
          <DialogDescription>{t("site.doctor.connector.credentialHint")}</DialogDescription>
        </DialogHeader>
        {open && <CredentialField provider={provider} onChange={setCredential} />}
        {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
        <DialogFooter>
          <Button loading={busy} disabled={credential === null} onClick={() => startBusy(async () => {
            if (credential === null) return;
            const failed = await replaceCredential(id, credential).catch(() => OFFLINE);
            setError(failed);
            if (failed === null) setOpen(false);
          })}>{t("site.doctor.connector.credentialSave")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditConnector({ id, name, interval }: { id: string; name: string; interval: number }) {
  const t = useT();
  const say = useSay();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name, interval: String(interval) });
  const [error, setError] = useState<Text | null>(null);
  const [busy, startBusy] = useTransition();
  const label = (seconds: number) => {
    const parts = intervalParts(seconds);
    return t(`site.doctor.connector.every.${parts.unit}`, { count: parts.count });
  };
  return (
    <Dialog open={open} onOpenChange={(next) => { if (busy) return; setOpen(next); if (next) setDraft({ name, interval: String(interval) }); else setError(null); }}>
      <DialogTrigger asChild><Button variant="outline" size="sm">{t("site.doctor.connector.edit")}</Button></DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader><DialogTitle>{t("site.doctor.connector.editTitle")}</DialogTitle></DialogHeader>
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          startBusy(async () => {
            const failed = await editConnector(id, { name: draft.name, sync_interval_seconds: Number(draft.interval) }).catch(() => OFFLINE);
            setError(failed);
            if (failed === null) setOpen(false);
          });
        }}>
          <FormField label={t("site.doctor.connector.name")} htmlFor="doctor-connector-name">
            <Input id="doctor-connector-name" required minLength={2} maxLength={80} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.currentTarget.value }))} />
          </FormField>
          <FormField label={t("site.doctor.connector.interval")} htmlFor="doctor-connector-interval">
            <OptionSelect id="doctor-connector-interval" value={draft.interval} onChange={(value) => setDraft((current) => ({ ...current, interval: value }))}
              options={intervalOptions(interval).map((seconds) => ({ value: String(seconds), label: label(seconds) }))} />
          </FormField>
          {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
          <DialogFooter><Button type="submit" loading={busy}>{t("site.doctor.connector.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
