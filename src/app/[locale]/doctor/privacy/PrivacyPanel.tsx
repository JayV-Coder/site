"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmAction, FormField, ToggleRow } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Schemas } from "@/modules/doctor/api";
import { CONTRACTED, aiProfileKey, checkStatus, classKey, profileChangeKeys, profileDetailKey, profileOptions, reindexProgress, retentionValid, shortDate } from "@/modules/doctor/privacy";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { cancelDeletion, requestDeletion, setAiProfile, setLlm, setRetention } from "./actions";

type Settings = Schemas["PrivacySettings"];

function ErrorText({ error }: { error: ReturnType<typeof useKeyedAction>["error"] }) {
  const say = useSay();
  return error ? <p role="alert" className="text-sm text-destructive">{say(error)}</p> : null;
}

function RetentionRow({ item, manager }: { item: Settings["retention"][number]; manager: boolean }) {
  const t = useT();
  const [days, setDays] = useState(String(item.days));
  const save = useKeyedAction();
  const name = t(classKey(item.data_class));
  const value = Number(days);
  const valid = retentionValid(value, item);
  return (
    <li className="grid gap-2 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="grid">
          <strong className="font-medium">{name}</strong>
          <span className="text-xs text-muted-foreground">{item.days === item.default_days ? t("site.doctor.privacy.default") : t("site.doctor.privacy.defaultWas", { days: t("site.doctor.privacy.days", { count: item.default_days }) })}</span>
        </span>
        {!manager && <span className="text-sm">{t("site.doctor.privacy.days", { count: item.days })}</span>}
      </div>
      {manager && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); if (valid) save.run((key) => setRetention(item.data_class, value, key), undefined, days); }}>
          <FormField label={t("site.doctor.privacy.retentionRange", { min: item.min_days, max: item.max_days })} htmlFor={`doctor-retention-${item.data_class}`} className="min-w-40 flex-1">
            <Input id={`doctor-retention-${item.data_class}`} type="number" inputMode="numeric" min={item.min_days} max={item.max_days} value={days} aria-invalid={!valid || undefined}
              onChange={(event) => { setDays(event.currentTarget.value); if (save.error) save.reset(); }} />
          </FormField>
          <Button type="submit" variant="outline" loading={save.busy} disabled={!valid || value === item.days}>{t("site.doctor.privacy.save")}</Button>
        </form>
      )}
      <ErrorText error={save.error} />
    </li>
  );
}

function LlmToggle({ enabled, manager }: { enabled: boolean; manager: boolean }) {
  const t = useT();
  const [checked, setChecked] = useState(enabled);
  const action = useKeyedAction();
  return (
    <div className="grid gap-2">
      <ToggleRow id="doctor-llm" label={t("site.doctor.privacy.llm")} hint={t("site.doctor.privacy.llmHint")} checked={checked} disabled={!manager || action.busy}
        onChange={(next) => { setChecked(next); action.reset(); action.run((key) => setLlm(next, key), undefined, String(next)); }} />
      <ErrorText error={action.error} />
    </div>
  );
}

/** O Owner com MFA escolhe e confirma o perfil de IA: a troca muda onde os dados são processados,
 * e sair do dedicado ou do local só volta pela operação da plataforma. */
function AiProfile({ settings, owner, locale }: { settings: Settings; owner: boolean; locale: string }) {
  const t = useT();
  const current = settings.ai_profile;
  const [chosen, setChosen] = useState<string>(current);
  const change = useKeyedAction();
  const check = checkStatus(settings.ai_check);
  const reindex = reindexProgress(settings.reindex);
  const chosenName = t(aiProfileKey(chosen));
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-medium text-muted-foreground">{t("site.doctor.privacy.profileLegend")}</legend>
      {profileOptions(current).map((profile) => (
        <label key={profile} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 has-[:checked]:border-foreground/40">
          <input type="radio" name="doctor-ai-profile" value={profile} className="mt-1" checked={chosen === profile} disabled={!owner || change.busy || CONTRACTED.includes(profile)}
            onChange={() => { setChosen(profile); change.reset(); }} />
          <span className="grid">
            <strong className="font-medium">{t(aiProfileKey(profile))}</strong>
            <span className="text-xs text-muted-foreground">{t(profileDetailKey(profile))}</span>
          </span>
        </label>
      ))}
      {owner && chosen !== current && (
        <ConfirmAction title={t("site.doctor.privacy.switchTitle", { profile: chosenName })} description={profileChangeKeys(current, chosen).map((key) => t(key)).join(" ")} confirm={t("site.doctor.privacy.confirmSwitch")}
          onConfirm={() => change.run((key) => setAiProfile(chosen, key), undefined, chosen)}>
          <Button className="justify-self-start" loading={change.busy}>{t("site.doctor.privacy.switchTo", { profile: chosenName })}</Button>
        </ConfirmAction>
      )}
      <ErrorText error={change.error} />
      {check && (
        <p role="status" className={check.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
          {t(check.key, { date: shortDate(locale, settings.ai_check?.checked_at ?? ""), region: check.region ?? t("site.doctor.privacy.check.regionFallback"), detail: check.detail ?? t("site.doctor.privacy.check.detailFallback") })}
        </p>
      )}
      {reindex && <p role="status" className="text-sm text-muted-foreground">{t("site.doctor.privacy.reindex", reindex)}</p>}
      {!owner && <p className="text-sm text-muted-foreground">{t("site.doctor.privacy.ownerOnly")}</p>}
      {!CONTRACTED.includes(current) && <p className="text-sm text-muted-foreground">{t("site.doctor.privacy.contractNote")}</p>}
    </fieldset>
  );
}

function Deletion({ scheduled, slug }: { scheduled: boolean; slug: string }) {
  const t = useT();
  const [typed, setTyped] = useState("");
  const action = useKeyedAction();
  if (scheduled) {
    return (
      <div className="grid justify-items-start gap-2">
        <Button variant="outline" loading={action.busy} onClick={() => action.run((key) => cancelDeletion(key))}>{t("site.doctor.privacy.deletion.cancel")}</Button>
        <ErrorText error={action.error} />
      </div>
    );
  }
  return (
    <div className="grid max-w-xl gap-3 rounded-lg border border-destructive/40 px-4 py-4">
      <h3 className="font-medium">{t("site.doctor.privacy.deletion.title")}</h3>
      <p className="text-sm text-muted-foreground">{t("site.doctor.privacy.deletion.body", { slug })}</p>
      <FormField label={t("site.doctor.privacy.deletion.field")} htmlFor="doctor-deletion-slug">
        <Input id="doctor-deletion-slug" value={typed} autoCapitalize="none" spellCheck={false} onChange={(event) => { setTyped(event.currentTarget.value); action.reset(); }} />
      </FormField>
      <ErrorText error={action.error} />
      <ConfirmAction title={t("site.doctor.privacy.deletion.title")} description={t("site.doctor.privacy.deletion.body", { slug })} confirm={t("site.doctor.privacy.deletion.confirm")}
        onConfirm={() => action.run((key) => requestDeletion(typed.trim(), key))}>
        <Button variant="destructive" className="justify-self-start" loading={action.busy} disabled={typed.trim() !== slug}>{t("site.doctor.privacy.deletion.confirm")}</Button>
      </ConfirmAction>
    </div>
  );
}

export function PrivacyPanel({ locale, settings, manager, owner, slug }: { locale: string; settings: Settings; manager: boolean; owner: boolean; slug: string }) {
  const t = useT();
  return (
    <div className="grid gap-6">
      <section aria-labelledby="doctor-retention" className="grid gap-3">
        <h2 id="doctor-retention" className="text-sm font-medium text-muted-foreground">{t("site.doctor.privacy.retention")}</h2>
        <ul className="grid gap-3 @3xl:grid-cols-2">{settings.retention.map((item) => <RetentionRow key={item.data_class} item={item} manager={manager} />)}</ul>
      </section>
      <section aria-labelledby="doctor-lgpd" className="grid max-w-2xl gap-3">
        <h2 id="doctor-lgpd" className="text-sm font-medium text-muted-foreground">{t("site.doctor.privacy.lgpd")}</h2>
        <LlmToggle enabled={settings.llm_enabled} manager={manager} />
        <AiProfile settings={settings} owner={owner} locale={locale} />
        <ul className="grid gap-2 text-sm">
          <li><Link className="underline underline-offset-4" href={`/${locale}/doctor/subprocessors`}>{t("site.doctor.nav.subprocessors")}</Link></li>
          {manager && <li><Link className="underline underline-offset-4" href={`/${locale}/doctor/subject`}>{t("site.doctor.subject.title")}</Link> <span className="text-muted-foreground">— {t("site.doctor.subject.hint")}</span></li>}
        </ul>
      </section>
      {settings.deletion && <p role="status" className="text-sm text-destructive">{t("site.doctor.privacy.deletion.scheduled", { date: shortDate(locale, settings.deletion.scheduled_for) })}</p>}
      {owner && <Deletion scheduled={settings.deletion !== null} slug={slug} />}
    </div>
  );
}
