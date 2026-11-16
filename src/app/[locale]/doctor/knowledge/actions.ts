"use server";

import { doctorSearch, type Schemas } from "@/modules/doctor/api";
import { sendForResult, sendToDoctor, type Result } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

type KnowledgeResults = Schemas["KnowledgeResults"];

const PAGE = "/[locale]/doctor/knowledge";
const KNOWN = { invalid_filename: "site.doctor.import.error.filename" };

/** Cria o documento e devolve a URL assinada: o arquivo vai direto para o Storage. Sem chave de
 * idempotência: com ela, a criação ficaria numa transação ainda aberta quando a API pede a URL, e
 * o Storage não enxergaria o documento para assinar (o mesmo motivo da rota própria de URL na
 * Importação, docs/api/imports.md). */
export async function createDocument(body: { title: string; filename: string; content_type: string; size_bytes: number }): Promise<Result<{ id: string; upload_url: string }>> {
  return sendForResult<{ id: string; upload_url: string }>("/knowledge/documents", { method: "POST", body: JSON.stringify(body) }, {
    known: KNOWN, invalid: "site.doctor.knowledge.error.file",
  });
}

/** Depois do envio, a indexação começa. */
export async function finishDocument(id: string): Promise<Text | null> {
  return sendToDoctor(`/knowledge/documents/${encodeURIComponent(id)}/finish`, { method: "POST" }, { revalidate: PAGE, known: KNOWN });
}

export async function deleteDocument(id: string, key: string): Promise<Text | null> {
  return sendToDoctor(`/knowledge/documents/${encodeURIComponent(id)}`, { method: "DELETE" }, { revalidate: PAGE, key, known: KNOWN });
}

/** A pergunta vai no corpo, nunca no endereço. */
export async function searchKnowledge(q: string): Promise<KnowledgeResults | null> {
  return doctorSearch<KnowledgeResults>("/knowledge/search", { q: q.trim().slice(0, 500), k: 8 });
}
