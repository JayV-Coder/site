"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormField, OptionSelect } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Schemas } from "@/modules/doctor/api";
import { INTERVALS, intervalText } from "@/modules/doctor/connectors";
import { OFFLINE, useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { buildGcpConfig, EMPTY_GCP, GCP_DRAFT_KEY, gcloudCommands, readGcpDraft, SEVERITIES, validName, validProject, type GcpDraft } from "@/modules/doctor/wizard";
import { useHref, useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { cn } from "@/lib/utils";
import { createConnector, testNewConnection } from "../actions";
import { CredentialField } from "../CredentialField";
import { CopyCommand, TestOutcome, WizardActions, WizardDone, WizardStep } from "./WizardParts";

type TestResult = Schemas["TestResult"];

function store(key: string, draft: GcpDraft) {
  try { sessionStorage.setItem(key, JSON.stringify(draft)); } catch { /* Sem sessionStorage: perde-se só o progresso. */ }
}

/** O assistente do Google Cloud. O rascunho (sem a credencial) fica na aba, um por Organização;
 * a credencial e os testes ficam só na memória: voltar à página pede a chave de novo. */
export function GcpWizard({ tenantId, integrations }: { tenantId: string; integrations: { id: string; label: string }[] }) {
  const t = useT();
  const say = useSay();
  const href = useHref();
  const router = useRouter();
  const key = `${GCP_DRAFT_KEY}:${tenantId}`;
  const [draft, setDraft] = useState<GcpDraft>(EMPTY_GCP);
  const [credential, setCredential] = useState<string | null>(null);
  const [connection, setConnection] = useState<{ result: TestResult | null; error: Text | null }>({ result: null, error: null });
  const [preview, setPreview] = useState<{ result: TestResult | null; error: Text | null }>({ result: null, error: null });
  const [resumed, setResumed] = useState(false);
  const [busy, startBusy] = useTransition();
  const save = useKeyedAction();
  // Cada mudança na config ou na chave invalida os testes em andamento: a resposta de um teste
  // antigo não libera o passo seguinte para o que ainda não foi testado.
  const round = useRef(0);
  const restored = useRef(false);
  const clear = { result: null, error: null };
  const untest = () => { round.current += 1; setConnection(clear); setPreview(clear); };
  const unpreview = () => { round.current += 1; setPreview(clear); };
  const titles = [t("site.doctor.wizard.gcp.step1"), t("site.doctor.wizard.gcp.step2"), t("site.doctor.wizard.gcp.step3"), t("site.doctor.wizard.step4")];

  useEffect(() => {
    // Uma vez só: a página redesenhada pelo servidor (ao ativar, por exemplo) não volta o passo.
    if (restored.current) return;
    restored.current = true;
    let saved = EMPTY_GCP;
    try { saved = readGcpDraft(sessionStorage.getItem(key)); } catch { /* Sem sessionStorage: começa do zero. */ }
    // A Integração do rascunho pode ter sido arquivada desde então.
    if (!integrations.some(({ id }) => id === saved.integration_id)) saved = { ...saved, integration_id: "" };
    // Sem a credencial (que não fica guardada), quem passou do passo 2 volta para ele.
    setResumed(saved.step > 2);
    setDraft({ ...saved, step: saved.step > 2 ? 2 : saved.step });
  }, [key, integrations]);

  const update = (change: Partial<GcpDraft>) => {
    const next = { ...draft, ...change };
    setDraft(next);
    if (save.error) save.reset();
    store(key, next);
  };
  const go = (step: GcpDraft["step"]) => { update({ step }); setResumed(false); };
  const config = buildGcpConfig(draft);
  const test = (set: typeof setConnection) => {
    if (credential === null) return;
    const mine = round.current;
    startBusy(async () => {
      const outcome = await testNewConnection("gcp", config, credential).catch(() => ({ ok: false as const, error: OFFLINE }));
      if (mine !== round.current) return;
      set(outcome.ok ? { result: outcome.value, error: null } : { result: null, error: outcome.error });
    });
  };
  const activate = () => {
    if (credential === null) return;
    const request = {
      provider: "gcp" as const, integration_id: draft.integration_id, name: draft.name.trim() || draft.project_id, config,
      sync_interval_seconds: draft.sync_interval_seconds, credential,
    };
    let created: string | null = null;
    save.run(async (requestKey) => {
      const outcome = await createConnector(request, requestKey);
      if (!outcome.ok) return outcome.error;
      created = outcome.value.id;
      return null;
    }, () => {
      try { sessionStorage.removeItem(key); } catch { /* Sem sessionStorage não há rascunho. */ }
      if (created) router.push(href(`/doctor/connectors/${created}`));
    }, JSON.stringify(request));
  };
  const project = t("site.doctor.wizard.gcp.doneProject", { project: draft.project_id });

  return (
    <WizardStep provider="Google Cloud" step={draft.step} titles={titles}>
      {draft.step === 1 && (
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); go(2); }}>
          <FormField label={t("site.doctor.wizard.gcp.project")} htmlFor="doctor-gcp-project" hint={t("site.doctor.wizard.gcp.projectHint")}>
            <Input id="doctor-gcp-project" required autoCapitalize="none" spellCheck={false} className="font-mono" value={draft.project_id}
              onChange={(event) => { update({ project_id: event.currentTarget.value.trim() }); untest(); }} />
          </FormField>
          <FormField label={t("site.doctor.wizard.name")} htmlFor="doctor-gcp-name" error={validName(draft.name) ? null : t("site.doctor.connector.error.edit")}>
            <Input id="doctor-gcp-name" minLength={2} maxLength={80} placeholder={draft.project_id || "acme-integracoes"} value={draft.name}
              onChange={(event) => update({ name: event.currentTarget.value })} />
          </FormField>
          <WizardActions>
            <Button asChild variant="outline"><Link href={href("/doctor/connectors")}>{t("common.cancel")}</Link></Button>
            <Button type="submit" disabled={!validProject(draft.project_id) || !validName(draft.name)}>{t("site.doctor.wizard.continue")}</Button>
          </WizardActions>
        </form>
      )}

      {/* O passo 2 fica montado escondido nos outros: a chave escolhida continua à vista ao voltar. */}
      <div className={cn("grid gap-3", draft.step !== 2 && "hidden")}>
          {resumed && <p role="status" className="rounded-md border border-border bg-secondary px-3 py-2 text-sm">{t("site.doctor.wizard.resumed")}</p>}
          <p className="text-sm text-muted-foreground">{t("site.doctor.wizard.gcp.keyHint")}</p>
          <p className="text-sm">{t("site.doctor.wizard.gcp.commands")}</p>
          {gcloudCommands(draft.project_id).map((command) => <CopyCommand key={command} command={command} />)}
          <CredentialField provider="gcp" onChange={(value) => { setCredential(value); untest(); }} />
          <TestOutcome {...connection} />
          <Button variant="outline" className="justify-self-start" loading={busy} disabled={credential === null} onClick={() => test(setConnection)}>{t("site.doctor.connector.test")}</Button>
          <WizardActions>
            <Button variant="outline" onClick={() => go(1)}>{t("site.doctor.wizard.back")}</Button>
            <Button disabled={!connection.result?.ok} onClick={() => go(3)}>{t("site.doctor.wizard.continue")}</Button>
          </WizardActions>
        </div>

      {draft.step === 3 && (
        <div className="grid gap-3">
          <WizardDone items={[project, t("site.doctor.wizard.doneTested")]} />
          <FormField label={t("site.doctor.wizard.gcp.services")} htmlFor="doctor-gcp-services">
            <Input id="doctor-gcp-services" autoCapitalize="none" spellCheck={false} placeholder="sap-order-sync, sf-customer-sync" value={draft.services}
              onChange={(event) => { update({ services: event.currentTarget.value }); unpreview(); }} />
          </FormField>
          <FormField label={t("site.doctor.wizard.gcp.severity")} htmlFor="doctor-gcp-severity">
            <OptionSelect id="doctor-gcp-severity" value={draft.min_severity} onChange={(value) => { update({ min_severity: value }); unpreview(); }}
              options={SEVERITIES.map((value) => ({ value, label: value === "DEFAULT" ? t("site.doctor.wizard.gcp.allSeverities") : value }))} />
          </FormField>
          <FormField label={t("site.doctor.wizard.gcp.filter")} htmlFor="doctor-gcp-filter">
            <Textarea id="doctor-gcp-filter" rows={2} maxLength={2000} spellCheck={false} className="font-mono text-xs" value={draft.filter}
              onChange={(event) => { update({ filter: event.currentTarget.value }); unpreview(); }} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t("site.doctor.connector.interval")} htmlFor="doctor-gcp-interval">
              <OptionSelect id="doctor-gcp-interval" value={String(draft.sync_interval_seconds)} onChange={(value) => update({ sync_interval_seconds: Number(value) })}
                options={INTERVALS.map((seconds) => ({ value: String(seconds), label: intervalText(t, seconds) }))} />
            </FormField>
            <FormField label={t("site.doctor.wizard.gcp.backfill")} htmlFor="doctor-gcp-backfill">
              <OptionSelect id="doctor-gcp-backfill" value={String(draft.backfill_hours)} onChange={(value) => update({ backfill_hours: value === "168" ? 168 : 24 })}
                options={[{ value: "24", label: t("site.doctor.executions.period.24h") }, { value: "168", label: t("site.doctor.executions.period.7d") }]} />
            </FormField>
          </div>
          <section aria-labelledby="doctor-gcp-preview" className="grid gap-2 rounded-lg border border-border bg-card px-4 py-3">
            <h3 id="doctor-gcp-preview" className="text-sm font-medium">{t("site.doctor.wizard.gcp.preview")}</h3>
            {!preview.result && !preview.error && <p className="text-sm text-muted-foreground">{t("site.doctor.wizard.gcp.previewHint")}</p>}
            <TestOutcome {...preview} />
            <Button variant="outline" className="justify-self-start" loading={busy} disabled={credential === null} onClick={() => test(setPreview)}>{t("site.doctor.wizard.gcp.previewRun")}</Button>
          </section>
          <WizardActions>
            <Button variant="outline" onClick={() => go(2)}>{t("site.doctor.wizard.back")}</Button>
            <Button disabled={!preview.result?.ok} onClick={() => go(4)}>{t("site.doctor.wizard.continue")}</Button>
          </WizardActions>
        </div>
      )}

      {draft.step === 4 && (
        <div className="grid gap-3">
          <WizardDone items={[project, t("site.doctor.wizard.doneTested"), t("site.doctor.wizard.gcp.donePreview")]} />
          <FormField label={t("site.doctor.wizard.integration")} htmlFor="doctor-gcp-integration">
            <OptionSelect id="doctor-gcp-integration" value={draft.integration_id || "none"} onChange={(value) => update({ integration_id: value === "none" ? "" : value })}
              options={[{ value: "none", label: t("site.doctor.wizard.choose"), disabled: true }, ...integrations.map((item) => ({ value: item.id, label: item.label }))]} />
          </FormField>
          <p className="text-sm text-muted-foreground">{t(draft.backfill_hours === 168 ? "site.doctor.wizard.gcp.activateHint7d" : "site.doctor.wizard.gcp.activateHint24h")}</p>
          {save.error && <p role="alert" className="text-sm text-destructive">{say(save.error)}</p>}
          <WizardActions>
            <Button variant="outline" onClick={() => go(3)}>{t("site.doctor.wizard.back")}</Button>
            <Button loading={save.busy} disabled={draft.integration_id === "" || credential === null} onClick={activate}>{t("site.doctor.wizard.activate")}</Button>
          </WizardActions>
        </div>
      )}
    </WizardStep>
  );
}
