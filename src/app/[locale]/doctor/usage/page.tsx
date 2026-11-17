import type { Metadata } from "next";
import { PageHeading } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { doctorList, type Schemas } from "@/modules/doctor/api";
import { amountText, meterTone, percentOf, planKey, quotaWarning, resourceKey } from "@/modules/doctor/usage";
import { getT } from "@/modules/i18n/server";
import { cn } from "@/lib/utils";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { Unavailable, UnavailablePage } from "../Unavailable";

type Usage = Schemas["Usage"];

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/usage">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.nav.usage")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

const TONES = { ok: "bg-primary", warning: "bg-warning", danger: "bg-destructive" } as const;

/** Tela 17: uma barra por recurso do plano, o aviso de Cota e o consumo de IA do mês. */
export default async function UsagePage({ params }: PageProps<"/[locale]/doctor/usage">) {
  const { locale } = await params;
  const access = await requireDoctor(locale, "/doctor/usage");
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const usage = await doctorList<Usage>("/usage");
  const number = new Intl.NumberFormat(locale);
  const plan = usage ? planKey(usage.plan) : null;

  return (
    <DoctorShell locale={locale} active={access.active} current="usage">
      <PageHeading title={t("site.doctor.nav.usage")} description={t("site.doctor.usage.intro")}>
        {usage && <Badge variant="secondary">{plan ? t(plan) : usage.plan}</Badge>}
      </PageHeading>
      {!usage ? <Unavailable locale={locale} title={t("site.doctor.usage.unavailable")} retry="/doctor/usage" /> : (
        <div className="grid gap-4">
          <ul className="grid gap-3 @3xl:grid-cols-2">
            {usage.resources.map((item) => {
              const key = resourceKey(item.resource);
              const name = key ? t(key) : item.resource;
              const warning = quotaWarning(item.resource, item.ratio, usage.tolerance);
              const percent = percentOf(item.ratio);
              return (
                <li key={item.resource} className="grid gap-2 rounded-lg border border-border bg-card px-4 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{name}</span>
                    <span className="text-sm text-muted-foreground">{amountText(locale, item.resource, item.used)} / {amountText(locale, item.resource, item.quota)}</span>
                  </div>
                  <div role="meter" aria-label={t("site.doctor.usage.meter", { resource: name })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", TONES[meterTone(item.ratio)])} style={{ width: `${String(percent)}%` }} />
                  </div>
                  {warning && <p role="status" className="text-sm text-warning">{t(warning.key, warning.params)}</p>}
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted-foreground">
            {t("site.doctor.usage.llmMonth", { tokens: number.format(usage.llm.input_tokens + usage.llm.output_tokens) })}
            {" · "}
            {usage.llm.cost_estimate !== null
              ? t("site.doctor.usage.cost", { cost: new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(usage.llm.cost_estimate) })
              : t("site.doctor.usage.costUnavailable")}
          </p>
        </div>
      )}
    </DoctorShell>
  );
}
