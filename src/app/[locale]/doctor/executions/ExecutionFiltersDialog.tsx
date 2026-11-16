"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontalIcon } from "lucide-react";
import { FormField, OptionSelect } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PERIOD_HOURS, type ExecutionFilters } from "@/modules/doctor/executions";
import { ENVIRONMENTS, EXECUTION_STATUSES } from "@/modules/doctor/labels";
import type { Key } from "@/modules/i18n";
import { useT } from "@/modules/i18n";

const ANY = "any";

/** Todos os filtros numa janela: Integração, Ambiente, status e período. Aplicar só troca o
 * endereço; a página relê do servidor. */
export function ExecutionFiltersDialog({ base, filters, integrations }: {
  base: string; filters: ExecutionFilters; integrations: { id: string; name: string }[];
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const current = () => ({
    integration: filters.integration ?? ANY, environment: filters.environment ?? ANY, status: filters.status ?? ANY, period: filters.period ?? ANY,
  });
  const [draft, setDraft] = useState<Required<Record<keyof ExecutionFilters, string>>>(current);
  const set = (key: keyof ExecutionFilters) => (value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const any = { value: ANY, label: t("site.doctor.executions.any") };

  const apply = (next: typeof draft | null) => {
    const query = new URLSearchParams();
    if (next) for (const [key, value] of Object.entries(next)) if (value !== ANY) query.set(key, value);
    const text = query.toString();
    setOpen(false);
    router.push(text ? `${base}?${text}` : base);
  };

  return (
    // Abre sempre com os filtros do endereço: um filtro rápido pode ter mudado desde a última vez.
    <Dialog open={open} onOpenChange={(next) => { if (next) setDraft(current()); setOpen(next); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><SlidersHorizontalIcon />{t("site.doctor.executions.filters")}</Button>
      </DialogTrigger>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader><DialogTitle>{t("site.doctor.executions.filters")}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <FormField label={t("site.doctor.executions.integration")} htmlFor="doctor-executions-integration">
            <OptionSelect id="doctor-executions-integration" value={draft.integration} onChange={set("integration")}
              options={[any, ...integrations.map((item) => ({ value: item.id, label: item.name }))]} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t("site.doctor.executions.environment")} htmlFor="doctor-executions-environment">
              <OptionSelect id="doctor-executions-environment" value={draft.environment} onChange={set("environment")}
                options={[any, ...ENVIRONMENTS.map((value) => ({ value, label: t(`site.doctor.env.${value}` as Key) }))]} />
            </FormField>
            <FormField label={t("site.doctor.executions.status")} htmlFor="doctor-executions-status">
              <OptionSelect id="doctor-executions-status" value={draft.status} onChange={set("status")}
                options={[any, ...EXECUTION_STATUSES.map((value) => ({ value, label: t(`site.doctor.execution.status.${value}` as Key) }))]} />
            </FormField>
          </div>
          <FormField label={t("site.doctor.executions.periodLabel")} htmlFor="doctor-executions-period">
            <OptionSelect id="doctor-executions-period" value={draft.period} onChange={set("period")}
              options={[any, ...Object.keys(PERIOD_HOURS).map((value) => ({ value, label: t(`site.doctor.executions.period.${value}` as Key) }))]} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => apply(null)}>{t("site.doctor.executions.clear")}</Button>
          <Button onClick={() => apply(draft)}>{t("site.doctor.executions.apply")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
