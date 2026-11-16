"use server";

import type { Schemas } from "@/modules/doctor/api";
import { sendForResult, sendToDoctor } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

type TestResult = Schemas["TestResult"];

const LIST = "/[locale]/doctor/connectors";
const KNOWN = {
  connector_paused: "site.doctor.connector.error.paused",
  connector_disabled: "site.doctor.connector.error.disabled",
  sync_running: "site.doctor.connector.error.syncRunning",
  provider_unavailable: "site.doctor.connector.error.provider",
  invalid_config: "site.doctor.connector.error.invalidConfig",
};

const path = (id: string, suffix = "") => `/connectors/${encodeURIComponent(id)}${suffix}`;

/** Sincronizar só põe o pedido na fila: a tela não muda na hora (o status chega depois). */
export async function runConnectorAction(id: string, action: "sync" | "pause" | "resume"): Promise<Text | null> {
  return sendToDoctor(path(id, `/${action}`), { method: "POST" }, { revalidate: LIST, layout: true, known: KNOWN });
}

/** A credencial salva fica no cofre e não sai de lá: o teste usa a enviada aqui, que a API
 * descarta depois. A resposta diz o que deu certo ou o que falhou, no texto da API. */
export async function testSavedConnection(id: string, credential: string): Promise<{ ok: true; value: TestResult } | { ok: false; error: Text }> {
  return sendForResult<TestResult>(path(id, "/test"), { method: "POST", body: JSON.stringify({ credential }) }, { known: KNOWN });
}

export async function replaceCredential(id: string, credential: string): Promise<Text | null> {
  return sendToDoctor(path(id), { method: "PATCH", body: JSON.stringify({ credential }) }, { revalidate: LIST, layout: true, known: KNOWN });
}

export async function editConnector(id: string, change: { name: string; sync_interval_seconds: number }): Promise<Text | null> {
  return sendToDoctor(path(id), { method: "PATCH", body: JSON.stringify({ name: change.name.trim(), sync_interval_seconds: change.sync_interval_seconds }) }, {
    revalidate: LIST, layout: true, known: KNOWN, invalid: "site.doctor.connector.error.edit",
  });
}
