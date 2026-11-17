"use client";

import { useState, type ChangeEvent } from "react";
import { UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { contentTypeOf, KNOWLEDGE_ACCEPT, KNOWLEDGE_MAX_BYTES, titleOf } from "@/modules/doctor/knowledge";
import { OFFLINE } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { createDocument, finishDocument } from "./actions";

/** O arquivo vai direto do navegador para o Storage, pela URL assinada: não passa pela API. */
function put(url: string, file: File, type: string): Promise<boolean> {
  return fetch(url, { method: "PUT", headers: { "content-type": type }, body: file }).then((response) => response.ok).catch(() => false);
}

export function UploadDocument() {
  const t = useT();
  const say = useSay();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Text | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const send = async (file: File): Promise<Text | null> => {
    const type = contentTypeOf(file.name);
    if (!type) return { key: "site.doctor.knowledge.error.type" };
    if (file.size > KNOWLEDGE_MAX_BYTES) return { key: "site.doctor.knowledge.error.size" };
    const created = await createDocument({ title: titleOf(file.name), filename: file.name, content_type: type, size_bytes: file.size });
    if (!created.ok) return created.error;
    if (!(await put(created.value.upload_url, file, type))) return { key: "site.doctor.import.error.upload" };
    return finishDocument(created.value.id);
  };

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    setSent(null);
    void send(file).catch(() => OFFLINE).then((failed) => {
      setError(failed);
      if (failed === null) setSent(file.name);
    }).finally(() => setBusy(false));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (busy) return; setOpen(next); if (!next) { setError(null); setSent(null); } }}>
      <DialogTrigger asChild><Button size="sm"><UploadIcon />{t("site.doctor.knowledge.upload")}</Button></DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{t("site.doctor.knowledge.uploadTitle")}</DialogTitle>
          <DialogDescription>{t("site.doctor.knowledge.uploadHint")}</DialogDescription>
        </DialogHeader>
        <label className="grid cursor-pointer justify-items-center gap-1 rounded-lg border border-dashed border-border px-4 py-6 text-center transition-colors hover:bg-secondary/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55">
          <UploadIcon aria-hidden="true" className="size-6 text-muted-foreground" />
          <span className="text-sm font-medium">{t("site.doctor.import.choose")}</span>
          <span className="text-xs text-muted-foreground">{t("site.doctor.knowledge.formats")}</span>
          <input type="file" accept={KNOWLEDGE_ACCEPT} className="sr-only" disabled={busy} onChange={choose} />
        </label>
        {busy && <p role="status" className="text-sm text-muted-foreground">{t("site.doctor.import.sending")}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
        {sent && <p role="status" className="text-sm text-success">{t("site.doctor.knowledge.sent", { name: sent })}</p>}
      </DialogContent>
    </Dialog>
  );
}
