"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { CheckList, FormField } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { WEBHOOK_EVENTS } from "@/modules/doctor/alerts";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT, type Key } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { createWebhook } from "./actions";
import { SecretOnce } from "./SecretOnce";

const EMPTY = { name: "", url: "", events: ["incident.opened"] as string[] };

export function NewWebhook() {
  const t = useT();
  const say = useSay();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<Text | null>(null);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const close = () => { setOpen(false); setDraft(EMPTY); setSecret(null); setError(null); setKey(crypto.randomUUID()); };
  const edit = (change: Partial<typeof EMPTY>) => { setDraft((current) => ({ ...current, ...change })); setError(null); };

  const submit = async () => {
    setBusy(true);
    const result = await createWebhook(draft, key).catch((): { ok: false; error: Text } => ({ ok: false, error: { key: "site.doctor.error.offline" } }));
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    setSecret(result.value.secret);
    setKey(crypto.randomUUID());
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (busy) return; if (next) setOpen(true); else close(); }}>
      <DialogTrigger asChild><Button size="sm"><PlusIcon />{t("site.doctor.webhooks.new")}</Button></DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader><DialogTitle>{t("site.doctor.webhooks.new")}</DialogTitle></DialogHeader>
        {secret ? <SecretOnce secret={secret} /> : (
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <FormField label={t("site.doctor.webhooks.name")} htmlFor="doctor-webhook-name">
              <Input id="doctor-webhook-name" required minLength={2} maxLength={80} value={draft.name} onChange={(event) => edit({ name: event.currentTarget.value })} />
            </FormField>
            <FormField label={t("site.doctor.webhooks.url")} htmlFor="doctor-webhook-url">
              <Input id="doctor-webhook-url" type="url" required autoCapitalize="none" spellCheck={false} placeholder="https://" value={draft.url} onChange={(event) => edit({ url: event.currentTarget.value })} />
            </FormField>
            <FormField label={t("site.doctor.webhooks.events")} hint={t("site.doctor.webhooks.eventsNote")}>
              <CheckList id="doctor-webhook-event" selected={draft.events} onChange={(events) => edit({ events })}
                items={WEBHOOK_EVENTS.map((value) => ({ value, label: t(`site.doctor.webhooks.event.${value}` as Key) }))} />
            </FormField>
            {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
            <DialogFooter><Button type="submit" loading={busy} disabled={draft.events.length === 0}>{t("site.doctor.webhooks.create")}</Button></DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
