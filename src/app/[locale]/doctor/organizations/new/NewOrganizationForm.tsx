"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { FormField, SegmentedControl } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SLUG_MAX, slugify } from "@/modules/doctor/labels";
import { useHref, useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { createOrganization } from "../actions";

const SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
type Segment = "" | "consulting" | "industry" | "retail";
type Provider = "anthropic" | "vertex";

/** A primeira Organização de quem chega (ou mais uma): o nome sugere o identificador até
 * alguém mexer nele. Criar já a deixa ativa e leva ao painel. */
export function NewOrganizationForm({ canGoBack }: { canGoBack: boolean }) {
  const t = useT();
  const say = useSay();
  const href = useHref();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [typed, setTyped] = useState(false);
  const [segment, setSegment] = useState<Segment>("");
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<Text | null>(null);
  const [busy, startBusy] = useTransition();
  const badSlug = slug.length > 0 && !SLUG.test(slug);
  const ready = name.trim().length >= 2 && SLUG.test(slug) && segment !== "" && accepted;
  const segments = [
    { value: "consulting" as const, label: t("site.doctor.org.segment.consulting") },
    { value: "industry" as const, label: t("site.doctor.org.segment.industry") },
    { value: "retail" as const, label: t("site.doctor.org.segment.retail") },
  ];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    startBusy(async () => {
      const failed = await createOrganization({ name: name.trim(), slug, segment, llmProvider: provider, dpaAccepted: accepted })
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
      <FormField label={t("site.doctor.org.segment")} htmlFor="doctor-org-segment">
        <Select value={segment || undefined} onValueChange={(value) => setSegment(value as Segment)}>
          <SelectTrigger id="doctor-org-segment" className="w-full min-w-0">
            <SelectValue placeholder={t("site.doctor.org.segment.pick")} />
          </SelectTrigger>
          <SelectContent>
            {segments.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label={t("site.doctor.org.ai")} hint={provider === "anthropic" ? t("site.doctor.org.ai.anthropicHint") : t("site.doctor.org.ai.vertexHint")}>
        <SegmentedControl label={t("site.doctor.org.ai")} value={provider} onChange={setProvider}
          options={[
            { value: "anthropic", label: t("site.doctor.org.ai.anthropic") },
            { value: "vertex", label: t("site.doctor.org.ai.vertex") },
          ]} />
      </FormField>
      <div className="flex items-start gap-2.5">
        <Checkbox id="doctor-org-dpa" checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} className="mt-0.5" />
        <Label htmlFor="doctor-org-dpa" className="text-sm leading-snug font-normal">{t("site.doctor.org.dpa")}</Label>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy} disabled={!ready}>{t("site.doctor.org.create")}</Button>
        {canGoBack && <Button asChild variant="ghost"><Link href={href("/doctor")}>{t("site.doctor.org.back")}</Link></Button>}
      </div>
    </form>
  );
}
