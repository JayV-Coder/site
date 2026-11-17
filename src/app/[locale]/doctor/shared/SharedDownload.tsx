"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { dispositionName } from "@/modules/doctor/reports";
import { useT } from "@/modules/i18n";

export function SharedDownload() {
  const t = useT();
  const [error, setError] = useState<"invalid" | "failed" | null>(null);
  const [busy, startBusy] = useTransition();
  return (
    <div className="grid justify-items-start gap-3">
      {error && <p role="alert" className="text-sm text-destructive">{t(error === "invalid" ? "site.doctor.shared.invalid" : "site.doctor.shared.failed")}</p>}
      <Button loading={busy} onClick={() => {
        setError(null);
        startBusy(async () => {
          const response = await fetch("/api/doctor/shared", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token: window.location.hash.slice(1) }),
          }).catch(() => null);
          if (!response?.ok) { setError(response?.status === 404 ? "invalid" : "failed"); return; }
          const url = URL.createObjectURL(await response.blob());
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = dispositionName(response.headers.get("content-disposition"));
          document.body.append(anchor);
          anchor.click();
          anchor.remove();
          // Safari no iOS e o Firefox ainda leem o blob depois do clique: libera só depois.
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        });
      }}>{t("site.doctor.shared.download")}</Button>
    </div>
  );
}
