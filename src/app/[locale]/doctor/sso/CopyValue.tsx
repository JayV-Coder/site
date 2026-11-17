"use client";

import { useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/modules/i18n";

/** Um valor para colar em outro lugar (o DNS, o IdP), com o botão de copiar. */
export function CopyValue({ label, value }: { label: string; value: string }) {
  const t = useT();
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const copy = () => {
    const show = (result: "ok" | "failed") => { window.clearTimeout(timer.current); setCopied(result); timer.current = window.setTimeout(() => setCopied(null), 2000); };
    navigator.clipboard.writeText(value).then(() => show("ok"), () => show("failed"));
  };
  return (
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 rounded-md border border-border bg-muted px-3 py-2 text-xs break-all">{value}</code>
        <Button type="button" variant="outline" size="sm" aria-label={`${t("site.doctor.sso.copy")} · ${label}`} onClick={copy}>{copied === "ok" ? <CheckIcon /> : <CopyIcon />}</Button>
      </div>
      {copied && <p role="status" className="text-xs text-muted-foreground">{t(copied === "ok" ? "site.doctor.sso.copied" : "site.doctor.sso.copyFailed")}</p>}
    </div>
  );
}
