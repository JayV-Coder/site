"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/molecules";
import { Input } from "@/components/ui/input";
import { applicationServerKey } from "@/modules/doctor/alerts";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { saveQuiet, subscribePush, unsubscribePush } from "./actions";

const WORKER = "/doctor-push-sw.js";
type State = "unknown" | "unsupported" | "denied" | "on" | "off";

/** "Meus canais": o push deste aparelho e o silêncio fora do plantão (Tela 20). */
export function MyChannels({ pushKey, subscriptions, quiet }: {
  pushKey: string | null; subscriptions: { id: string; endpoint: string }[]; quiet: { start: string; end: string } | null;
}) {
  const t = useT();
  const say = useSay();
  const [state, setState] = useState<State>("unknown");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [error, setError] = useState<Text | null>(null);
  const [busy, setBusy] = useState(false);
  const quietAction = useKeyedAction();
  const [range, setRange] = useState({ start: quiet?.start ?? "", end: quiet?.end ?? "" });

  useEffect(() => {
    if (!pushKey || !("serviceWorker" in navigator) || !("PushManager" in window)) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }
    let cancelled = false;
    void navigator.serviceWorker.register(WORKER).then(() => navigator.serviceWorker.ready).then((registration) => registration.pushManager.getSubscription()).then((current) => {
      if (cancelled) return;
      setEndpoint(current?.endpoint ?? null);
      setState(current && subscriptions.some((item) => item.endpoint === current.endpoint) ? "on" : "off");
    }).catch(() => { if (!cancelled) setState("unsupported"); });
    return () => { cancelled = true; };
  }, [pushKey, subscriptions]);

  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      if ((await Notification.requestPermission()) !== "granted") { setState("denied"); return; }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(pushKey ?? "") });
      const json = subscription.toJSON() as { keys?: { p256dh?: string; auth?: string } };
      const failed = await subscribePush({
        endpoint: subscription.endpoint, keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" }, user_agent: navigator.userAgent.slice(0, 300),
      }, crypto.randomUUID());
      if (failed) { await subscription.unsubscribe().catch(() => undefined); setError(failed); return; }
      setEndpoint(subscription.endpoint);
      setState("on");
    } catch {
      setError({ key: "site.doctor.alerts.push.failed" });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration(WORKER);
      const mine = subscriptions.find((item) => item.endpoint === endpoint);
      const failed = mine ? await unsubscribePush(mine.id, crypto.randomUUID()) : null;
      if (failed) { setError(failed); return; }
      await (await registration?.pushManager.getSubscription())?.unsubscribe();
      setState("off");
    } catch {
      setError({ key: "site.doctor.alerts.push.failed" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <span className="grid min-w-0 gap-0.5">
          <span className="font-medium">{t("site.doctor.alerts.push.title")}</span>
          {state === "denied" && <span className="text-xs text-muted-foreground">{t("site.doctor.alerts.push.denied")}</span>}
          {state === "unsupported" && <span className="text-xs text-muted-foreground">{t("site.doctor.alerts.push.unsupported")}</span>}
        </span>
        <span className="flex items-center gap-2">
          {state === "on" && <Badge variant="success">{t("site.doctor.alerts.push.active")}</Badge>}
          {state === "on" && <Button variant="outline" size="sm" loading={busy} onClick={() => void disable()}>{t("site.doctor.alerts.push.disable")}</Button>}
          {state === "off" && <Button size="sm" loading={busy} onClick={() => void enable()}>{t("site.doctor.alerts.push.enable")}</Button>}
        </span>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
      <form className="grid gap-3 rounded-lg border border-border bg-card px-4 py-4"
        onSubmit={(event) => { event.preventDefault(); quietAction.run((key) => saveQuiet(range.start, range.end, key)); }}>
        <p className="text-sm text-muted-foreground">
          {quiet ? t("site.doctor.alerts.quiet.range", { start: quiet.start, end: quiet.end }) : t("site.doctor.alerts.quiet.none")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t("site.doctor.alerts.quietFrom")} htmlFor="doctor-quiet-from">
            <Input id="doctor-quiet-from" type="time" value={range.start} onChange={(event) => setRange({ ...range, start: event.currentTarget.value })} />
          </FormField>
          <FormField label={t("site.doctor.alerts.quietUntil")} htmlFor="doctor-quiet-until">
            <Input id="doctor-quiet-until" type="time" value={range.end} onChange={(event) => setRange({ ...range, end: event.currentTarget.value })} />
          </FormField>
        </div>
        {quietAction.error && <p role="alert" className="text-sm text-destructive">{say(quietAction.error)}</p>}
        <div><Button type="submit" variant="outline" size="sm" loading={quietAction.busy}>{t("site.doctor.alerts.quiet.save")}</Button></div>
      </form>
    </div>
  );
}
