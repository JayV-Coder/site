"use server";

import type { Schemas } from "@/modules/doctor/api";
import { sendForResult, sendToDoctor } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

type Secret = Schemas["WebhookSecret"];

const PAGE = "/[locale]/doctor/webhooks";
const KNOWN = {
  not_found: "site.doctor.webhooks.error.notFound",
  name_taken: "site.doctor.webhooks.error.nameTaken",
  unsafe_url: "site.doctor.webhooks.error.unsafeUrl",
};
const id = (value: string) => encodeURIComponent(value);

/** O segredo vem uma vez, na resposta: a tela o mostra e a API não o devolve de novo. */
export async function createWebhook(draft: { name: string; url: string; events: string[] }, key: string): Promise<{ ok: true; value: Secret } | { ok: false; error: Text }> {
  return sendForResult<Secret>("/webhooks", {
    method: "POST", body: JSON.stringify({ name: draft.name.trim(), url: draft.url.trim(), events: draft.events }),
  }, { revalidate: PAGE, key, known: KNOWN, invalid: "site.doctor.webhooks.error.invalid" });
}

export async function toggleWebhook(hook: string, enabled: boolean, key: string): Promise<Text | null> {
  return sendToDoctor(`/webhooks/${id(hook)}`, { method: "PATCH", body: JSON.stringify({ enabled }) }, { revalidate: PAGE, key, known: KNOWN });
}

export async function rotateSecret(hook: string, key: string): Promise<{ ok: true; value: Secret } | { ok: false; error: Text }> {
  return sendForResult<Secret>(`/webhooks/${id(hook)}/rotate-secret`, { method: "POST" }, { revalidate: PAGE, key, known: KNOWN });
}

export async function deleteWebhook(hook: string, key: string): Promise<Text | null> {
  return sendToDoctor(`/webhooks/${id(hook)}`, { method: "DELETE" }, { revalidate: PAGE, key, known: KNOWN });
}

/** Cada clique é um reenvio novo: quem chama passa uma chave nova. */
export async function resendDelivery(delivery: string, key: string): Promise<Text | null> {
  return sendToDoctor(`/webhook-deliveries/${id(delivery)}/resend`, { method: "POST" }, { revalidate: PAGE, key, known: KNOWN });
}
