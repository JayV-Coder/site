"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { utcDateTime } from "@/modules/doctor/labels";
import { useLocale, useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { revokeShare } from "./actions";

type Share = { id: string; expires_at: string; access_count: number };

/** Os links ativos de um relatório: revogar corta o acesso na hora (ADR-0014). */
export function ShareList({ reportId, shares }: { reportId: string; shares: Share[] }) {
  const t = useT();
  const say = useSay();
  const locale = useLocale();
  const [error, setError] = useState<Text | null>(null);
  const [busy, startBusy] = useTransition();
  return (
    <ul className="grid gap-1.5">
      {shares.map((share) => (
        <li key={share.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{t("site.doctor.report.shareLine", { when: utcDateTime(locale, share.expires_at), count: share.access_count })}</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => startBusy(async () => {
            setError(await revokeShare(reportId, share.id).catch((): Text => ({ key: "site.doctor.error.offline" })));
          })}>
            {t("site.doctor.report.revoke")}
          </Button>
        </li>
      ))}
      {error && <li role="alert" className="text-sm text-destructive">{say(error)}</li>}
    </ul>
  );
}
