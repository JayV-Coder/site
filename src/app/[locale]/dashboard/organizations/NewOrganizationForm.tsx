"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField, SettingsSection } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFeedback } from "@/modules/feedback";
import { useHref, useT } from "@/modules/i18n";
import { SLUG_MAX, slugify, slugOk } from "@/modules/organizations/rules";
import { createOrganization } from "./actions";

/** A organização nova, como o diálogo do app: o nome sugere o slug até
 * alguém mexer nele. Quem cria vira owner e cai na página dela. */
export function NewOrganizationForm() {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const { notify, report } = useFeedback();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [typed, setTyped] = useState(false);
  const [busy, startBusy] = useTransition();
  const badSlug = slug.length > 0 && !slugOk(slug);

  const close = () => { setOpen(false); setName(""); setSlug(""); setTyped(false); };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !slugOk(slug)) return;
    startBusy(async () => {
      const result = await createOrganization(name, slug);
      if (!result.ok) {
        report(result.error);
        return;
      }
      notify(t("site.org.created", { name: name.trim() }));
      router.push(href(`/dashboard/organizations/${result.data}`));
    });
  };

  if (!open) return <Button className="justify-self-start" onClick={() => setOpen(true)}>{t("org.new.title")}</Button>;

  return (
    <SettingsSection title={t("org.new.title")} description={t("org.new.description")}>
      <form onSubmit={submit} className="grid gap-4 @xl:grid-cols-2">
        <FormField label={t("org.field.name")} htmlFor="org-name">
          <Input id="org-name" required maxLength={80} value={name} autoFocus
            onChange={(event) => { setName(event.target.value); if (!typed) setSlug(slugify(event.target.value)); }} />
        </FormField>
        <FormField label={t("org.field.slug")} htmlFor="org-slug" hint={t("org.field.slug.hint")} error={badSlug ? t("org.field.slug.invalid", { max: SLUG_MAX }) : null}>
          <div className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-sm text-muted-foreground">@</span>
            <Input id="org-slug" required maxLength={SLUG_MAX} spellCheck={false} autoCapitalize="none" className="ps-7" aria-invalid={badSlug || undefined} value={slug}
              onChange={(event) => { setTyped(true); setSlug(event.target.value.toLowerCase().replace(/\s/g, "-")); }} />
          </div>
        </FormField>
        <div className="flex flex-wrap justify-end gap-2 @xl:col-span-2">
          <Button type="button" variant="ghost" onClick={close}>{t("common.cancel")}</Button>
          <Button type="submit" loading={busy} disabled={!name.trim() || !slugOk(slug)}>{t("org.new.create")}</Button>
        </div>
      </form>
    </SettingsSection>
  );
}
