"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { ConfirmAction, FormField, OptionSelect } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CHANNEL_KINDS } from "@/modules/doctor/alerts";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT, type Key } from "@/modules/i18n";
import { createChannel, deleteChannel, type ChannelDraft } from "./actions";

type Channel = { id: string; type: string; name: string; config: Record<string, unknown> };
const EMPTY: ChannelDraft = { type: "webpush", name: "", webhook: "", audience: "managers" };

const kindKey = (kind: string) => `site.doctor.alerts.channel.kind.${kind}` as Key;
const isKind = (kind: string) => (CHANNEL_KINDS as readonly string[]).includes(kind);

function RemoveChannel({ channel }: { channel: Channel }) {
  const t = useT();
  const say = useSay();
  const action = useKeyedAction();
  return (
    <div className="grid justify-items-end gap-1">
      <ConfirmAction title={t("site.doctor.alerts.channel.removeTitle", { name: channel.name })} description={t("site.doctor.alerts.channel.removeBody")}
        confirm={t("site.doctor.alerts.remove")} onConfirm={() => action.run((key) => deleteChannel(channel.id, key))}>
        <Button variant="ghost" size="sm" loading={action.busy} aria-label={t("site.doctor.alerts.channel.removeTitle", { name: channel.name })}>{t("site.doctor.alerts.remove")}</Button>
      </ConfirmAction>
      {action.error && <p role="alert" className="text-xs text-destructive">{say(action.error)}</p>}
    </div>
  );
}

/** Canais da Organização (Owner e Admin): o endereço do Slack ou do Teams vai para o cofre e não volta. */
export function Channels({ channels }: { channels: Channel[] }) {
  const t = useT();
  const say = useSay();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const action = useKeyedAction();
  const set = (field: keyof ChannelDraft) => (value: string) => { setDraft((current) => ({ ...current, [field]: value })); if (action.error) action.reset(); };
  const chat = draft.type === "slack" || draft.type === "teams";
  const ticket = draft.type === "jira" || draft.type === "servicenow";

  return (
    <div className="grid gap-3">
      {channels.length > 0 && (
        <ul className="grid gap-2">
          {channels.map((channel) => (
            <li key={channel.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <span className="grid min-w-0 gap-0.5">
                <span className="font-medium break-words">{channel.name}</span>
                <span className="text-xs text-muted-foreground">
                  {isKind(channel.type) ? t(kindKey(channel.type)) : channel.type}
                  {channel.config.audience === "all" ? ` · ${t("site.doctor.alerts.channel.audienceAll")}` : channel.config.audience ? ` · ${t("site.doctor.alerts.channel.audienceManagers")}` : ""}
                </span>
              </span>
              <RemoveChannel channel={channel} />
            </li>
          ))}
        </ul>
      )}
      <div>
        <Dialog open={open} onOpenChange={(next) => { if (action.busy) return; setOpen(next); if (!next) { setDraft(EMPTY); action.reset(); } }}>
          <DialogTrigger asChild><Button variant="outline" size="sm"><PlusIcon />{t("site.doctor.alerts.channel.new")}</Button></DialogTrigger>
          <DialogContent closeLabel={t("common.close")}>
            <DialogHeader><DialogTitle>{t("site.doctor.alerts.channel.new")}</DialogTitle></DialogHeader>
            <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); action.run((key) => createChannel(draft, key), () => { setOpen(false); setDraft(EMPTY); }); }}>
              <FormField label={t("site.doctor.alerts.channel.type")} htmlFor="doctor-channel-type">
                <OptionSelect id="doctor-channel-type" value={draft.type} onChange={set("type")} options={CHANNEL_KINDS.map((value) => ({ value, label: t(kindKey(value)) }))} />
              </FormField>
              <FormField label={t("site.doctor.alerts.name")} htmlFor="doctor-channel-name">
                <Input id="doctor-channel-name" required minLength={2} maxLength={80} value={draft.name} onChange={(event) => set("name")(event.currentTarget.value)} />
              </FormField>
              {chat && (
                <FormField label={t("site.doctor.alerts.channel.webhookUrl")} htmlFor="doctor-channel-webhook">
                  <Input id="doctor-channel-webhook" type="url" required autoCapitalize="none" spellCheck={false} value={draft.webhook} onChange={(event) => set("webhook")(event.currentTarget.value)} />
                </FormField>
              )}
              {ticket && <p className="text-sm text-muted-foreground">{t("site.doctor.alerts.channel.ticketHint", { provider: draft.type === "jira" ? "Jira" : "ServiceNow" })}</p>}
              {!chat && !ticket && (
                <FormField label={t("site.doctor.alerts.channel.audience")} htmlFor="doctor-channel-audience">
                  <OptionSelect id="doctor-channel-audience" value={draft.audience} onChange={set("audience")}
                    options={[{ value: "managers", label: t("site.doctor.alerts.channel.audienceManagers") }, { value: "all", label: t("site.doctor.alerts.channel.audienceAll") }]} />
                </FormField>
              )}
              <p className="text-xs text-muted-foreground">{t("site.doctor.alerts.channel.contentNote")}</p>
              {action.error && <p role="alert" className="text-sm text-destructive">{say(action.error)}</p>}
              <DialogFooter><Button type="submit" loading={action.busy}>{t("site.doctor.alerts.channel.save")}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
