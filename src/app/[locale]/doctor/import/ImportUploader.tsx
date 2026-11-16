"use client";

import { useState, type ChangeEvent } from "react";
import { UploadIcon } from "lucide-react";
import { FormField, OptionSelect } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { OFFLINE } from "@/modules/doctor/useKeyedAction";
import { formatOf, headerColumns, IMPORT_FIELDS, initialMapping, MAX_BYTES, mappingChanged, type ImportField, type Mapping } from "@/modules/doctor/imports";
import { useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { completeImport, createImport, mappingFor, saveMapping, uploadUrl } from "./actions";

const ACCEPT = ".json,.ndjson,.csv";
const HEAD_BYTES = 64 * 1024;
/** JSON só é lido inteiro até este tamanho (para achar o primeiro registro); acima, sem mapeamento. */
const JSON_READ_LIMIT = 5 * 1024 * 1024;
const BY_NAME = "__by_name";

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** O arquivo vai direto do navegador para o Storage, pela URL assinada: não passa pela API. */
function put(url: string, file: File, onProgress: (ratio: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("content-type", file.type || "application/octet-stream");
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(event.loaded / event.total); };
    request.onload = () => resolve(request.status >= 200 && request.status < 300);
    request.onerror = () => resolve(false);
    request.send(file);
  });
}

type Draft = { file: File; columns: string[] | null; saved: Record<string, string>; mapping: Mapping };

/** Escolher a Integração e o arquivo, conferir o mapeamento de colunas e importar. Recusa
 * (formato, tamanho, duplicada) não é erro aqui: a Importação aparece na lista com o motivo. */
export function ImportUploader({ integrations }: { integrations: { id: string; label: string }[] }) {
  const t = useT();
  const say = useSay();
  const [integration, setIntegration] = useState(integrations[0]?.id ?? "");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<Text | null>(null);
  // Uma chave por arquivo escolhido: repetir o envio do mesmo arquivo não cria outra Importação.
  const [key, setKey] = useState(() => crypto.randomUUID());

  const prepare = async (file: File, target: string) => {
    setError(null);
    setDraft(null);
    setKey(crypto.randomUUID());
    const format = formatOf(file.name);
    // Formato ou tamanho fora: a API recusa e a lista mostra o motivo; sem mapeamento a conferir.
    if (!format || file.size === 0 || file.size > MAX_BYTES) { setDraft({ file, columns: null, saved: {}, mapping: {} }); return; }
    setReading(true);
    try {
      const text = format === "json" ? (file.size <= JSON_READ_LIMIT ? await file.text() : null) : await file.slice(0, HEAD_BYTES).text();
      const columns = text === null ? null : headerColumns(format, text);
      const found = columns ? await mappingFor(target, columns).catch(() => null) : null;
      setDraft({ file, columns, saved: found?.saved ?? {}, mapping: columns && found ? initialMapping(columns, found.saved, found.suggestion) : {} });
    } catch {
      setDraft({ file, columns: null, saved: {}, mapping: {} });
    } finally {
      setReading(false);
    }
  };

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (file) void prepare(file, integration);
  };

  const send = async () => {
    if (!draft) return;
    setError(null);
    setProgress(0);
    try {
      const columns = Object.fromEntries(Object.entries(draft.mapping).filter(([, column]) => column)) as Record<string, string>;
      // O mapeamento é da Integração: só grava quando mudou para este arquivo.
      if (draft.columns && mappingChanged(columns, Object.fromEntries(Object.entries(draft.saved).filter(([, column]) => draft.columns?.includes(column))))) {
        const failed = await saveMapping(integration, columns, crypto.randomUUID());
        if (failed) { setError(failed); return; }
      }
      const created = await createImport({ integration_id: integration, filename: draft.file.name, size_bytes: draft.file.size, sha256: await sha256(draft.file) }, key);
      if (!created.ok) { setError(created.error); return; }
      if (created.value.status !== "pending") { setDraft(null); return; }
      const url = await uploadUrl(created.value.id);
      if (!url.ok) { setError(url.error); return; }
      if (!(await put(url.value.upload_url, draft.file, setProgress))) { setError({ key: "site.doctor.import.error.upload" }); return; }
      const failed = await completeImport(created.value.id);
      setError(failed);
      if (failed === null) setDraft(null);
    } catch {
      setError(OFFLINE);
    } finally {
      setProgress(null);
    }
  };

  const set = (field: ImportField, column: string) => setDraft((current) => current && ({ ...current, mapping: { ...current.mapping, [field]: column === BY_NAME ? undefined : column } }));

  return (
    <section aria-labelledby="doctor-import-new" className="grid max-w-2xl gap-4 rounded-lg border border-border bg-card px-4 py-4">
      <h2 id="doctor-import-new" className="text-sm font-medium">{t("site.doctor.import.new")}</h2>
      <FormField label={t("site.doctor.connector.integration")} htmlFor="doctor-import-integration">
        <OptionSelect id="doctor-import-integration" value={integration} disabled={progress !== null}
          onChange={(value) => { setIntegration(value); if (draft) void prepare(draft.file, value); }}
          options={integrations.map((item) => ({ value: item.id, label: item.label }))} />
      </FormField>
      <label className="grid cursor-pointer justify-items-center gap-1 rounded-lg border border-dashed border-border px-4 py-6 text-center transition-colors hover:bg-secondary/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55">
        <UploadIcon aria-hidden="true" className="size-6 text-muted-foreground" />
        <span className="text-sm font-medium">{t("site.doctor.import.choose")}</span>
        <span className="text-xs text-muted-foreground">{t("site.doctor.import.formats")}</span>
        <input type="file" accept={ACCEPT} className="sr-only" disabled={progress !== null || reading} onChange={choose} />
      </label>

      {draft && (
        <div className="grid gap-3">
          <p className="text-sm"><span className="font-mono text-xs break-all">{draft.file.name}</span></p>
          {draft.columns ? (
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-sm font-medium">{t("site.doctor.import.mapping")}</legend>
              <p className="text-xs text-muted-foreground">{t("site.doctor.import.mappingHint")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {IMPORT_FIELDS.map((field) => (
                  <FormField key={field} label={t(`site.doctor.import.field.${field}`)} htmlFor={`doctor-import-${field}`}>
                    <OptionSelect id={`doctor-import-${field}`} value={draft.mapping[field] ?? BY_NAME} onChange={(value) => set(field, value)}
                      options={[{ value: BY_NAME, label: t("site.doctor.import.byName") }, ...(draft.columns ?? []).map((column) => ({ value: column, label: column }))]} />
                  </FormField>
                ))}
              </div>
            </fieldset>
          ) : (
            <p className="text-xs text-muted-foreground">{t("site.doctor.import.noHeader")}</p>
          )}
          {progress !== null && (
            <div role="status" aria-label={t("site.doctor.import.sending")} className="grid gap-1">
              <span className="text-xs text-muted-foreground">{t("site.doctor.import.progress", { percent: Math.round(progress * 100) })}</span>
              <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-foreground/70" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </div>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
          <div className="flex flex-wrap gap-2">
            <Button loading={progress !== null} onClick={() => void send()}>{t("site.doctor.import.send")}</Button>
            <Button variant="ghost" disabled={progress !== null} onClick={() => { setDraft(null); setError(null); }}>{t("common.cancel")}</Button>
          </div>
        </div>
      )}
      {reading && <p role="status" className="text-xs text-muted-foreground">{t("site.doctor.import.reading")}</p>}
    </section>
  );
}
