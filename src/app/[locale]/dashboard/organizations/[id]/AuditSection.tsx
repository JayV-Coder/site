"use client";

import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { FormField, SettingsSection } from "@/components/molecules";
import { Input } from "@/components/ui/input";
import { useT } from "@/modules/i18n";
import { auditRange, lastDays } from "@/modules/organizations/audit";
import type { OrganizationDetail } from "../data";

/** O log de auditoria da organização para baixar: quem pediu, em que projeto,
 * o agente e o modelo, os comandos validados, as ferramentas do agente e o
 * resultado da validação, num período de até um ano. O texto dos pedidos não
 * entra. Só owner e maintainer. */
export function AuditSection({ detail }: { detail: OrganizationDetail }) {
  const t = useT();
  const [range, setRange] = useState(() => lastDays(30));
  const valid = auditRange(range.from, range.to);
  const href = (format: "csv" | "json") => `/api/organizations/${detail.organization.id}/audit?from=${range.from}&to=${range.to}&format=${format}`;
  const link = "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3.5 text-sm font-medium transition-colors hover:bg-secondary";

  return (
    <SettingsSection title={t("site.audit.title")} description={t("site.audit.description")}>
      <div className="flex flex-wrap items-end gap-3">
        <FormField label={t("site.audit.from")} htmlFor="audit-from">
          <Input id="audit-from" type="date" value={range.from} max={range.to} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} />
        </FormField>
        <FormField label={t("site.audit.to")} htmlFor="audit-to">
          <Input id="audit-to" type="date" value={range.to} min={range.from} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} />
        </FormField>
        {valid ? (
          <>
            <a className={link} href={href("csv")} download><DownloadIcon className="size-4" />{t("site.audit.csv")}</a>
            <a className={link} href={href("json")} download><DownloadIcon className="size-4" />{t("site.audit.json")}</a>
          </>
        ) : <p className="text-xs text-destructive">{t("site.audit.invalid")}</p>}
      </div>
      <p className="text-xs text-muted-foreground">{t("site.audit.columns")}</p>
    </SettingsSection>
  );
}
