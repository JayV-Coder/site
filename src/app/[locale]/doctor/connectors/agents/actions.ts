"use server";

import type { Schemas } from "@/modules/doctor/api";
import { sendForResult, sendToDoctor } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

type RegistrationToken = Schemas["RegistrationToken"];

const LIST = "/[locale]/doctor/connectors/agents";
const KNOWN = { invalid_config: "site.doctor.agent.error.config" };

/** A chave vem da tela: repetir o pedido sem resposta devolve o mesmo token, em vez de emitir
 * outro e invalidar o que já foi copiado. */
export async function createAgent(input: { name: string; integration_id: string; collections: Record<string, string>[] }, key: string): Promise<{ ok: true; value: RegistrationToken } | { ok: false; error: Text }> {
  return sendForResult<RegistrationToken>("/agents", {
    method: "POST", body: JSON.stringify({ name: input.name.trim(), integration_id: input.integration_id, config: { collections: input.collections } }),
  }, { revalidate: LIST, layout: true, key, known: KNOWN, invalid: "site.doctor.agent.error.invalid" });
}

/** Rotação: o segredo e a chave atuais param na hora; o agente se registra de novo com o token. */
export async function rotateAgent(id: string, key: string): Promise<{ ok: true; value: RegistrationToken } | { ok: false; error: Text }> {
  return sendForResult<RegistrationToken>(`/agents/${encodeURIComponent(id)}/rotate`, { method: "POST" }, { revalidate: LIST, key, known: KNOWN });
}

export async function revokeAgent(id: string, key: string): Promise<Text | null> {
  return sendToDoctor(`/agents/${encodeURIComponent(id)}/revoke`, { method: "POST" }, { revalidate: LIST, key, known: KNOWN });
}
