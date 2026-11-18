"use server";

import { sendToDoctor } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

const PAGE = "/[locale]/doctor/privacy";
const KNOWN = {
  retention_out_of_bounds: "site.doctor.privacy.error.retentionOutOfBounds",
  confirmation_mismatch: "site.doctor.privacy.error.confirmationMismatch",
  dedicated_by_contract: "site.doctor.privacy.error.dedicatedByContract",
};
const write = (path: string, init: RequestInit, key: string) => sendToDoctor(path, init, { revalidate: PAGE, key, known: KNOWN });
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export async function setRetention(dataClass: string, days: number, key: string): Promise<Text | null> {
  return write("/privacy/retention", json("PUT", { data_class: dataClass, days }), key);
}
export async function setAiProfile(profile: string, key: string): Promise<Text | null> {
  return write("/privacy/ai-profile", json("PUT", { profile }), key);
}
export async function setLlm(enabled: boolean, key: string): Promise<Text | null> {
  return write("/privacy/llm", json("PUT", { enabled }), key);
}
export async function requestDeletion(confirmation: string, key: string): Promise<Text | null> {
  return write("/privacy/deletion", json("POST", { confirmation }), key);
}
export async function cancelDeletion(key: string): Promise<Text | null> {
  return write("/privacy/deletion", { method: "DELETE" }, key);
}
