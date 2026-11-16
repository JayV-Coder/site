"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormField, OptionSelect } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { Schemas } from "@/modules/doctor/api";
import { INTERVALS, intervalParts } from "@/modules/doctor/connectors";
import {
  buildSalesforceConfig, EMPTY_SALESFORCE, probeSalesforceConfig, SALESFORCE_SOURCES, validField, validObject,
  type SalesforceDraft, type SalesforceSource,
} from "@/modules/doctor/wizard";
import { useHref, useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { cn } from "@/lib/utils";
import { createConnector, testNewConnection } from "../actions";
import { SalesforceSecret } from "../CredentialField";
import { TestOutcome, WizardActions, WizardDone, WizardStep } from "./WizardParts";

type TestResult = Schemas["TestResult"];
const OFFLINE: Text = { key: "site.doctor.error.offline" };

/** O assistente do Salesforce (#37): a credencial da Connected App fica só na memória e vai para
 * o cofre ao ativar; nenhuma consulta é escrita aqui, só escolhida da allowlist. */
export function SalesforceWizard({ integrations }: { integrations: { id: string; label: string }[] }) {
  const t = useT();
  const say = useSay();
  const href = useHref();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [draft, setDraft] = useState<SalesforceDraft>(EMPTY_SALESFORCE);
  const [credential, setCredential] = useState<string | null>(null);
  const [connection, setConnection] = useState<{ result: TestResult | null; error: Text | null }>({ result: null, error: null });
  const [error, setError] = useState<Text | null>(null);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [busy, startBusy] = useTransition();
  const titles = [t("site.doctor.wizard.sf.step1"), t("site.doctor.wizard.sf.step2"), t("site.doctor.wizard.sf.step3"), t("site.doctor.wizard.step4")];
  const available = connection.result?.capabilities ?? {};
  const update = (change: Partial<SalesforceDraft>) => { setDraft((current) => ({ ...current, ...change })); setError(null); setRequestKey(crypto.randomUUID()); };
  const untested = () => setConnection({ result: null, error: null });

  const test = () => {
    if (credential === null) return;
    startBusy(async () => {
      const outcome = await testNewConnection("salesforce", probeSalesforceConfig(draft), credential).catch(() => ({ ok: false as const, error: OFFLINE }));
      setConnection(outcome.ok ? { result: outcome.value, error: null } : { result: null, error: outcome.error });
      // Já marca as fontes que a org tem.
      const found = outcome.ok ? outcome.value.capabilities ?? {} : {};
      update({ sources: SALESFORCE_SOURCES.filter((id) => found[id]) });
    });
  };
  const activate = () => {
    if (credential === null) return;
    startBusy(async () => {
      const created = await createConnector({
        provider: "salesforce", integration_id: draft.integration_id, name: draft.name.trim() || "Salesforce", config: buildSalesforceConfig(draft),
        sync_interval_seconds: draft.sync_interval_seconds, credential,
      }, requestKey).catch(() => ({ ok: false as const, error: OFFLINE }));
      if (!created.ok) { setError(created.error); return; }
      router.push(href(`/doctor/connectors/${created.value.id}`));
    });
  };
  const toggle = (source: SalesforceSource, on: boolean) => update({ sources: on ? [...draft.sources, source] : draft.sources.filter((item) => item !== source) });
  const interval = (seconds: number) => {
    const parts = intervalParts(seconds);
    return t(`site.doctor.connector.every.${parts.unit}`, { count: parts.count });
  };
  const fieldsOk = validField(draft.message_field) && validField(draft.severity_field);

  return (
    <WizardStep provider="Salesforce" step={step} titles={titles}>
      {step === 1 && (
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); setStep(2); }}>
          <FormField label={t("site.doctor.wizard.name")} htmlFor="doctor-sf-name">
            <Input id="doctor-sf-name" minLength={2} maxLength={80} placeholder={t("site.doctor.wizard.sf.namePlaceholder")} value={draft.name} onChange={(event) => update({ name: event.currentTarget.value })} />
          </FormField>
          <FormField label={t("site.doctor.wizard.sf.environment")} htmlFor="doctor-sf-environment">
            <OptionSelect id="doctor-sf-environment" value={draft.environment} onChange={(value) => { update({ environment: value }); untested(); }}
              options={[{ value: "production", label: t("site.doctor.wizard.sf.production") }, { value: "sandbox", label: t("site.doctor.wizard.sf.sandbox") }]} />
          </FormField>
          <FormField label={t("site.doctor.wizard.sf.object")} htmlFor="doctor-sf-object" hint={t("site.doctor.wizard.sf.objectHint")}
            error={validObject(draft.object) ? null : t("site.doctor.wizard.sf.objectInvalid")}>
            <Input id="doctor-sf-object" autoCapitalize="none" spellCheck={false} placeholder="Integration_Log__c" className="font-mono" aria-invalid={!validObject(draft.object) || undefined}
              value={draft.object} onChange={(event) => { update({ object: event.currentTarget.value.trim() }); untested(); }} />
          </FormField>
          <WizardActions>
            <Button asChild variant="outline"><Link href={href("/doctor/connectors")}>{t("common.cancel")}</Link></Button>
            <Button type="submit" disabled={!validObject(draft.object)}>{t("site.doctor.wizard.continue")}</Button>
          </WizardActions>
        </form>
      )}

      {/* O passo 2 fica montado escondido nos seguintes: a credencial só existe nos campos dele. */}
      <div className={cn("grid gap-3", step !== 2 && "hidden")}>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-xs text-muted-foreground">{t("site.doctor.credential.sfAuth")}</legend>
          {(["jwt_bearer", "web_server"] as const).map((mode) => (
            <label key={mode} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3.5 py-3 text-sm has-checked:border-foreground/40 has-checked:bg-secondary">
              <input type="radio" name="doctor-sf-auth-mode" className="size-4 accent-foreground" checked={draft.auth === mode}
                onChange={() => { update({ auth: mode }); setCredential(null); untested(); }} />
              {t(mode === "jwt_bearer" ? "site.doctor.wizard.sf.jwtRecommended" : "site.doctor.credential.sfWeb")}
            </label>
          ))}
        </fieldset>
        <SalesforceSecret key={draft.auth} auth={draft.auth} onChange={(value) => { setCredential(value); untested(); }} />
        <TestOutcome {...connection} />
        <Button variant="outline" className="justify-self-start" loading={busy} disabled={credential === null} onClick={test}>{t("site.doctor.connector.test")}</Button>
        <WizardActions>
          <Button variant="outline" onClick={() => setStep(1)}>{t("site.doctor.wizard.back")}</Button>
          <Button disabled={!connection.result?.ok} onClick={() => setStep(3)}>{t("site.doctor.wizard.continue")}</Button>
        </WizardActions>
      </div>

      {step === 3 && (
        <div className="grid gap-3">
          <WizardDone items={[t("site.doctor.wizard.doneTested")]} />
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-xs text-muted-foreground">{t("site.doctor.wizard.sf.sources")}</legend>
            {SALESFORCE_SOURCES.map((source) => {
              const has = Boolean(available[source]);
              return (
                <label key={source} className={cn("flex items-start gap-3 rounded-lg border border-border/60 px-3.5 py-3 text-sm", !has && "opacity-55")}>
                  <Checkbox className="mt-0.5" checked={draft.sources.includes(source)} disabled={!has} onCheckedChange={(checked) => toggle(source, checked === true)} />
                  <span className="grid gap-0.5">
                    <span>{t(`site.doctor.wizard.sf.source.${source}`)}</span>
                    {!has && <span className="text-xs text-muted-foreground">{t("site.doctor.wizard.sf.sourceMissing")}</span>}
                  </span>
                </label>
              );
            })}
          </fieldset>
          {draft.sources.includes("integration_log") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={t("site.doctor.wizard.sf.messageField")} htmlFor="doctor-sf-message" error={validField(draft.message_field) ? null : t("site.doctor.wizard.sf.fieldInvalid")}>
                <Input id="doctor-sf-message" autoCapitalize="none" spellCheck={false} placeholder="Message__c" className="font-mono" value={draft.message_field}
                  onChange={(event) => update({ message_field: event.currentTarget.value.trim() })} />
              </FormField>
              <FormField label={t("site.doctor.wizard.sf.severityField")} htmlFor="doctor-sf-severity" error={validField(draft.severity_field) ? null : t("site.doctor.wizard.sf.fieldInvalid")}>
                <Input id="doctor-sf-severity" autoCapitalize="none" spellCheck={false} placeholder="Severity__c" className="font-mono" value={draft.severity_field}
                  onChange={(event) => update({ severity_field: event.currentTarget.value.trim() })} />
              </FormField>
            </div>
          )}
          <FormField label={t("site.doctor.connector.interval")} htmlFor="doctor-sf-interval">
            <OptionSelect id="doctor-sf-interval" value={String(draft.sync_interval_seconds)} onChange={(value) => update({ sync_interval_seconds: Number(value) })}
              options={INTERVALS.map((seconds) => ({ value: String(seconds), label: interval(seconds) }))} />
          </FormField>
          <WizardActions>
            <Button variant="outline" onClick={() => setStep(2)}>{t("site.doctor.wizard.back")}</Button>
            <Button disabled={draft.sources.length === 0 || !fieldsOk} onClick={() => setStep(4)}>{t("site.doctor.wizard.continue")}</Button>
          </WizardActions>
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-3">
          <WizardDone items={[t("site.doctor.wizard.doneTested"), t("site.doctor.wizard.sf.doneSources", { count: draft.sources.length })]} />
          <FormField label={t("site.doctor.wizard.integration")} htmlFor="doctor-sf-integration">
            <OptionSelect id="doctor-sf-integration" value={draft.integration_id || "none"} onChange={(value) => update({ integration_id: value === "none" ? "" : value })}
              options={[{ value: "none", label: t("site.doctor.wizard.choose"), disabled: true }, ...integrations.map((item) => ({ value: item.id, label: item.label }))]} />
          </FormField>
          <p className="text-sm text-muted-foreground">{t("site.doctor.wizard.sf.activateHint")}</p>
          {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
          <WizardActions>
            <Button variant="outline" onClick={() => setStep(3)}>{t("site.doctor.wizard.back")}</Button>
            <Button loading={busy} disabled={draft.integration_id === "" || credential === null} onClick={activate}>{t("site.doctor.wizard.activate")}</Button>
          </WizardActions>
        </div>
      )}
    </WizardStep>
  );
}
