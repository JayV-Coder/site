"use client";

import { useEffect, useState } from "react";
import { ConfirmAction } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deliveryState, eventKey, webhookState } from "@/modules/doctor/alerts";
import type { Schemas } from "@/modules/doctor/api";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT, type Key } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { deleteWebhook, resendDelivery, rotateSecret, toggleWebhook } from "./actions";
import { SecretOnce } from "./SecretOnce";

type Hook = Schemas["Webhook"];
type Delivery = Schemas["Delivery"];

/** Um webhook: estado, endereço, eventos, novo segredo (mostrado uma vez) e as últimas entregas,
 * com "Reenviar". Uma chave de idempotência por ação, para uma não contaminar a outra. */
export function WebhookCard({ hook, deliveries, deliveriesFailed, times }: { hook: Hook; deliveries: Delivery[]; deliveriesFailed: boolean; times: Record<string, string> }) {
  const t = useT();
  const say = useSay();
  const [on, setOn] = useState(hook.enabled);
  const [secret, setSecret] = useState<string | null>(null);
  const [rotateError, setRotateError] = useState<Text | null>(null);
  const [rotating, setRotating] = useState(false);
  const [resendError, setResendError] = useState<Text | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const toggle = useKeyedAction();
  const remove = useKeyedAction();
  const [rotateId, setRotateId] = useState(() => crypto.randomUUID());
  // A API recusou: o interruptor volta ao que o servidor tem.
  useEffect(() => { if (toggle.error) setOn(hook.enabled); }, [toggle.error, hook.enabled]);
  const state = webhookState({ ...hook, enabled: on });
  const events = hook.events.map((event) => { const key = eventKey(event); return key ? t(key) : event; }).join(", ");
  const error = toggle.error ?? remove.error ?? rotateError ?? resendError;

  const rotate = async () => {
    setRotating(true);
    const result = await rotateSecret(hook.id, rotateId).catch((): { ok: false; error: Text } => ({ ok: false, error: { key: "site.doctor.error.offline" } }));
    setRotating(false);
    setRotateError(result.ok ? null : result.error);
    if (result.ok) { setSecret(result.value.secret); setRotateId(crypto.randomUUID()); }
  };
  const resend = async (id: string) => {
    setResending(id);
    // Cada clique é um reenvio novo.
    const failed = await resendDelivery(id, crypto.randomUUID()).catch((): Text => ({ key: "site.doctor.error.offline" }));
    setResending(null);
    setResendError(failed);
  };

  return (
    <article aria-labelledby={`doctor-webhook-${hook.id}`} className="grid content-start gap-3 rounded-lg border border-border bg-card px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <h2 id={`doctor-webhook-${hook.id}`} className="min-w-0 font-medium break-words">{hook.name}</h2>
        <Switch aria-label={hook.name} checked={on} disabled={toggle.busy} onCheckedChange={(next) => { setOn(next); toggle.run((key) => toggleWebhook(hook.id, next, key), undefined); }} />
      </div>
      <div><Badge variant={state.variant}>{t(state.key, state.params)}</Badge></div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{t("site.doctor.webhooks.address")}</dt>
        <dd className="break-all">{hook.url}</dd>
        <dt className="text-muted-foreground">{t("site.doctor.webhooks.events")}</dt>
        <dd className="break-words">{events}</dd>
        {hook.disabled_reason && (<><dt className="text-muted-foreground">{t("site.doctor.webhooks.disabled")}</dt><dd className="break-words">{hook.disabled_reason}</dd></>)}
      </dl>
      {secret && <SecretOnce secret={secret} />}
      {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" loading={rotating} onClick={() => void rotate()}>{t("site.doctor.webhooks.rotate")}</Button>
        <ConfirmAction title={t("site.doctor.webhooks.removeTitle", { name: hook.name })} description={t("site.doctor.webhooks.removeBody")} confirm={t("site.doctor.webhooks.remove")}
          onConfirm={() => remove.run((key) => deleteWebhook(hook.id, key))}>
          <Button variant="ghost" size="sm" loading={remove.busy}>{t("site.doctor.webhooks.remove")}</Button>
        </ConfirmAction>
      </div>
      <h3 className="text-sm font-medium text-muted-foreground">{t("site.doctor.webhooks.deliveries")}</h3>
      {deliveriesFailed && <p className="text-sm text-muted-foreground">{t("site.doctor.webhooks.deliveriesUnavailable")}</p>}
      {!deliveriesFailed && deliveries.length === 0 && <p className="text-sm text-muted-foreground">{t("site.doctor.webhooks.noDeliveries")}</p>}
      {deliveries.length > 0 && (
        <ul className="grid gap-2" aria-label={t("site.doctor.webhooks.deliveriesOf", { name: hook.name })}>
          {deliveries.map((delivery) => {
            const shown = deliveryState(delivery);
            const eventLabel = eventKey(delivery.event);
            return (
              <li key={delivery.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
                <span className="grid min-w-0 gap-0.5 text-sm">
                  <span>{eventLabel ? t(eventLabel as Key) : delivery.event} · {times[delivery.id]}</span>
                  <span className="text-xs break-words text-muted-foreground">
                    {t("site.doctor.webhooks.attempts", { count: delivery.attempts })}
                    {delivery.latency_ms !== null && ` · ${String(delivery.latency_ms)} ms`}
                    {delivery.error && ` · ${delivery.error}`}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant={shown.variant}>{t(shown.key, shown.params)}</Badge>
                  <Button variant="outline" size="sm" loading={resending === delivery.id} aria-label={t("site.doctor.webhooks.resendAt", { time: times[delivery.id] ?? "" })} onClick={() => void resend(delivery.id)}>{t("site.doctor.webhooks.resend")}</Button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
