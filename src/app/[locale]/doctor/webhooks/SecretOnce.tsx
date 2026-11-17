"use client";

import { useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/modules/i18n";

/** O segredo aparece uma vez: quem recebe guarda para conferir a assinatura de cada entrega. */
export function SecretOnce({ secret }: { secret: string }) {
  const t = useT();
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const copy = () => {
    const show = (result: "ok" | "failed") => { window.clearTimeout(timer.current); setCopied(result); timer.current = window.setTimeout(() => setCopied(null), 2000); };
    navigator.clipboard.writeText(secret).then(() => show("ok"), () => show("failed"));
  };
  return (
    <div role="status" className="grid gap-2">
      <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm">{t("site.doctor.webhooks.secretNote")}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 rounded-md border border-border bg-muted px-3 py-2 text-xs break-all">{secret}</code>
        <Button type="button" variant="outline" size="sm" onClick={copy}>{copied === "ok" ? <CheckIcon /> : <CopyIcon />}{t("site.doctor.webhooks.copy")}</Button>
      </div>
      {copied && <p role="status" className="text-xs text-muted-foreground">{t(copied === "ok" ? "site.doctor.webhooks.copied" : "site.doctor.webhooks.copyFailed")}</p>}
    </div>
  );
}
