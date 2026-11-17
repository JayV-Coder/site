"use server";

import { quietHours, ruleConditions, type RuleDraft } from "@/modules/doctor/alerts";
import { sendToDoctor } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

const PAGE = "/[locale]/doctor/alerts";
const KNOWN = { not_found: "site.doctor.alerts.error.notFound" };
const id = (value: string) => encodeURIComponent(value);

export async function createRule(draft: RuleDraft, key: string): Promise<Text | null> {
  return sendToDoctor("/alert-rules", {
    method: "POST",
    body: JSON.stringify({
      name: draft.name.trim(), conditions: ruleConditions(draft), channels: draft.channels, quiet_hours: quietHours(draft.quietStart, draft.quietEnd),
    }),
  }, { revalidate: PAGE, key, known: KNOWN, invalid: "site.doctor.alerts.error.invalidRule" });
}

export async function toggleRule(ruleId: string, enabled: boolean, key: string): Promise<Text | null> {
  return sendToDoctor(`/alert-rules/${id(ruleId)}`, { method: "PATCH", body: JSON.stringify({ enabled }) }, { revalidate: PAGE, key, known: KNOWN });
}

export async function deleteRule(ruleId: string, key: string): Promise<Text | null> {
  return sendToDoctor(`/alert-rules/${id(ruleId)}`, { method: "DELETE" }, { revalidate: PAGE, key, known: KNOWN });
}

export type ChannelDraft = { type: string; name: string; webhook: string; audience: string };

/** O endereço do Slack ou do Teams vai para o cofre da API e não volta. */
export async function createChannel(draft: ChannelDraft, key: string): Promise<Text | null> {
  const chat = draft.type === "slack" || draft.type === "teams";
  return sendToDoctor("/notification-channels", {
    method: "POST",
    body: JSON.stringify({ type: draft.type, name: draft.name.trim(), ...(chat ? { webhook_url: draft.webhook.trim() } : { audience: draft.audience || "managers" }) }),
  }, { revalidate: PAGE, key, known: KNOWN, invalid: "site.doctor.alerts.error.invalidChannel" });
}

export async function deleteChannel(channelId: string, key: string): Promise<Text | null> {
  return sendToDoctor(`/notification-channels/${id(channelId)}`, { method: "DELETE" }, { revalidate: PAGE, key, known: KNOWN });
}

export type DeviceSubscription = { endpoint: string; keys: { p256dh: string; auth: string }; user_agent: string };

export async function subscribePush(device: DeviceSubscription, key: string): Promise<Text | null> {
  return sendToDoctor("/push-subscriptions", { method: "POST", body: JSON.stringify(device) }, { revalidate: PAGE, key, known: KNOWN });
}

export async function unsubscribePush(subscription: string, key: string): Promise<Text | null> {
  return sendToDoctor(`/push-subscriptions/${id(subscription)}`, { method: "DELETE" }, { revalidate: PAGE, key, known: KNOWN });
}

export async function saveQuiet(start: string, end: string, key: string): Promise<Text | null> {
  return sendToDoctor("/alert-preferences", { method: "PUT", body: JSON.stringify({ quiet_hours: quietHours(start, end) }) }, { revalidate: PAGE, key, known: KNOWN, invalid: "site.doctor.alerts.error.invalidQuiet" });
}
