"use server";

import { doctorGet, doctorSearch, type Schemas } from "@/modules/doctor/api";
import { sendForResult, sendToDoctor } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

type ImportMapping = Schemas["ImportMapping"];
type MappingSuggestion = Schemas["MappingSuggestion"];
type CreatedImport = Schemas["CreatedImport"];

const PAGE = "/[locale]/doctor/import";
const KNOWN = {
  invalid_filename: "site.doctor.import.error.filename",
  import_not_pending: "site.doctor.import.error.notPending",
  upload_missing: "site.doctor.import.error.uploadMissing",
  storage_unavailable: "site.doctor.import.error.storage",
};

/** O mapeamento salvo da Integração e a sugestão para as colunas deste arquivo. Sem resposta,
 * nulo: a Importação segue com a detecção pelo nome. */
export async function mappingFor(integration: string, columns: string[]): Promise<{ saved: Record<string, string>; suggestion: Record<string, string> } | null> {
  const [saved, suggestion] = await Promise.all([
    doctorGet<ImportMapping>(`/imports/mappings/${encodeURIComponent(integration)}`),
    doctorSearch<MappingSuggestion>("/imports/mapping-suggestion", { columns: columns.slice(0, 200) }),
  ]);
  // Sem o salvo, não há como mudar só o que a pessoa escolher: a tela não oferece o mapeamento.
  if (!saved || saved === "not_found") return null;
  return { saved: saved.columns, suggestion: suggestion?.columns ?? {} };
}

/** Vale para as próximas Importações da Integração; `{}` volta à detecção pelo nome. */
export async function saveMapping(integration: string, columns: Record<string, string>, key: string): Promise<Text | null> {
  return sendToDoctor(`/imports/mappings/${encodeURIComponent(integration)}`, { method: "PUT", body: JSON.stringify({ columns }) }, {
    revalidate: PAGE, key, invalid: "site.doctor.import.error.mapping",
  });
}

export async function createImport(input: { integration_id: string; filename: string; size_bytes: number; sha256: string }, key: string): Promise<{ ok: true; value: CreatedImport } | { ok: false; error: Text }> {
  return sendForResult<CreatedImport>("/imports", { method: "POST", body: JSON.stringify(input) }, { revalidate: PAGE, key, known: KNOWN });
}

/** A URL assinada para subir o arquivo direto no Storage, sem passar pela API. */
export async function uploadUrl(id: string): Promise<{ ok: true; value: { upload_url: string } } | { ok: false; error: Text }> {
  return sendForResult<{ upload_url: string }>(`/imports/${encodeURIComponent(id)}/upload-url`, { method: "POST" }, { known: KNOWN });
}

export async function completeImport(id: string): Promise<Text | null> {
  return sendToDoctor(`/imports/${encodeURIComponent(id)}/complete`, { method: "POST" }, { revalidate: PAGE, known: KNOWN });
}
