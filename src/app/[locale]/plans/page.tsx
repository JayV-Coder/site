import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { PageHeading } from "@/components/molecules";
import { SitePage } from "@/components/organisms/SitePage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Key } from "@/modules/i18n";
import { getT } from "@/modules/i18n/server";
import { publicPlans, type PublicPlan } from "@/modules/plans/public";

/** O país de quem olha: o que a hospedagem informa (Vercel, Cloudflare) ou, na
 * falta, a região do idioma (`pt-BR` → BR). Sem nenhum, a moeda padrão. */
async function visitorCountry(locale: string): Promise<string | null> {
  const sent = await headers();
  const code = sent.get("x-vercel-ip-country") ?? sent.get("cf-ipcountry") ?? locale.split("-")[1] ?? null;
  return code && /^[A-Za-z]{2}$/.test(code) ? code.toUpperCase() : null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/plans">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.plans.title")} · JayV`, description: t("site.plans.description") };
}

function price(plan: PublicPlan, locale: string) {
  if (plan.isDefault || plan.priceCents === null || !plan.currency) return null;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: plan.currency.toUpperCase() }).format(plan.priceCents / 100);
  } catch {
    return `${(plan.priceCents / 100).toFixed(2)} ${plan.currency.toUpperCase()}`;
  }
}

/** A página pública dos planos: o que cada um traz e quanto custa. Quem
 * assina é o app (Planos), pelo Stripe; aqui só se vê e se cria a conta. */
export default async function PlansPage({ params, searchParams }: PageProps<"/[locale]/plans">) {
  const { locale } = await params;
  const { currency } = await searchParams;
  const wanted = typeof currency === "string" && /^[a-z]{3}$/i.test(currency) ? currency.toLowerCase() : null;
  const [t, plans] = await Promise.all([getT(locale), publicPlans(await visitorCountry(locale), wanted)]);
  // As moedas que algum plano vende, para a pessoa trocar.
  const currencies = [...new Set((plans ?? []).flatMap((plan) => plan.currencies))];
  const shownCode = plans?.find((plan) => plan.currency)?.currency;

  return (
    <SitePage locale={locale}>
      <div className="shell py-8 md:py-12">
        <PageHeading eyebrow={t("site.plans.eyebrow")} title={t("site.plans.title")} description={t("site.plans.description")} />
        {currencies.length > 1 && (
          <nav aria-label={t("site.plans.currency")} className="mb-5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-caption text-muted-foreground">{t("site.plans.currency")}</span>
            {currencies.map((code) => (
              <Button key={code} asChild size="sm" variant={code === shownCode ? "default" : "outline"}>
                <Link href={`/${locale}/plans?currency=${code}`} aria-current={code === shownCode ? "true" : undefined}>{code.toUpperCase()}</Link>
              </Button>
            ))}
          </nav>
        )}
        {!plans || plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("site.plans.empty")}</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
            {plans.map((plan) => {
              const amount = price(plan, locale);
              return (
                <li key={plan.key} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
                  <div className="grid gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-h2 font-semibold">{plan.name}</h2>
                      {plan.isDefault && <Badge variant="outline">{t("site.plans.current")}</Badge>}
                    </div>
                    <p className="flex items-baseline gap-1">
                      <span className="text-2xl font-semibold">{amount ?? t("site.plans.free")}</span>
                      {amount && plan.interval && <span className="text-sm text-muted-foreground">{t(plan.interval === "year" ? "site.plans.year" : "site.plans.month")}</span>}
                    </p>
                    {plan.description && <p className="text-sm leading-relaxed text-muted-foreground">{plan.description}</p>}
                  </div>
                  <div className="grid gap-2">
                    <span className="font-mono text-caption text-muted-foreground">{t("site.plans.includes")}</span>
                    <ul className="grid gap-1.5 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2"><CheckIcon aria-hidden="true" className="mt-0.5 size-4 flex-none text-go" /><span>{t(`feature.${feature}.title` as Key)}</span></li>
                      ))}
                    </ul>
                  </div>
                  <Button asChild className="mt-auto" variant={plan.isDefault ? "outline" : "default"}>
                    <Link href={`/${locale}/register`}>{t("site.nav.signUp")}</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-6 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">{t("site.plans.how")}</p>
      </div>
    </SitePage>
  );
}
