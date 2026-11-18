"use client";

import { useState, useTransition, type FormEvent } from "react";
import { FormField } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SLUG_MAX, slugify } from "@/modules/doctor/labels";
import { useHref, useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { createOrganization } from "./actions";
import { DoctorSettingsFields, useDoctorSettings } from "./DoctorSettings";

const SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/** Uma Organização nova (aparece também no jayv-coder): o nome sugere o identificador até
 * alguém mexer nele. Criar já a deixa ativa e leva ao painel. */
export function NewOrganizationForm() {
  const t = useT();
  const say = useSay();
  const href = useHref();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [typed, setTyped] = useState(false);
  const doctor = useDoctorSettings();
  const [error, setError] = useState<Text | null>(null);
  const [busy, startBusy] = useTransition();
  const badSlug = slug.length > 0 && !SLUG.test(slug);
  const ready = name.trim().length >= 2 && SLUG.test(slug) && doctor.settings !== null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const settings = doctor.settings;
    if (!ready || settings === null) return;
    startBusy(async () => {
      const failed = await createOrganization({ name: name.trim(), slug, ...settings })
        .catch((): Text => ({ key: "site.doctor.error.offline" }));
      setError(failed);
      if (failed === null) window.location.assign(href("/doctor"));
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FormField label={t("site.doctor.org.name")} htmlFor="doctor-org-name">
        <Input id="doctor-org-name" required minLength={2} maxLength={80} value={name}
          onChange={(event) => { setName(event.target.value); if (!typed) setSlug(slugify(event.target.value)); }} />
      </FormField>
      <FormField label={t("site.doctor.org.slug")} htmlFor="doctor-org-slug" hint={t("site.doctor.org.slugRule")} error={badSlug ? t("site.doctor.org.slugRule") : null}>
        <Input id="doctor-org-slug" required maxLength={SLUG_MAX} spellCheck={false} autoCapitalize="none" aria-invalid={badSlug || undefined} value={slug}
          onChange={(event) => { setTyped(true); setSlug(event.target.value.toLowerCase().replace(/\s/g, "-")); }} />
      </FormField>
      <DoctorSettingsFields id="doctor-org" state={doctor} />
      {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
      <div><Button type="submit" loading={busy} disabled={!ready}>{t("site.doctor.org.create")}</Button></div>
    </form>
  );
}
