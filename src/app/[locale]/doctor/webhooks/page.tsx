import type { Metadata } from "next";
import { PageHeading } from "@/components/molecules";
import { EmptyText } from "@/components/atoms";
import { doctorList, type Schemas } from "@/modules/doctor/api";
import { canManage, utcDateTime } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { Unavailable, UnavailablePage } from "../Unavailable";
import { NewWebhook } from "./NewWebhook";
import { WebhookCard } from "./WebhookCard";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/webhooks">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.nav.webhooks")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Webhooks de saída: só Owner e Admin com MFA. Cada card mostra o estado, os eventos e as
 * últimas entregas, com "Reenviar". */
export default async function WebhooksPage({ params }: PageProps<"/[locale]/doctor/webhooks">) {
  const { locale } = await params;
  const access = await requireDoctor(locale, "/doctor/webhooks");
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const manager = canManage(access.me);
  const hooks = manager ? await doctorList<Schemas["Webhook"][]>("/webhooks") : null;
  const deliveries = hooks ? await Promise.all(hooks.map((hook) => doctorList<Schemas["Delivery"][]>(`/webhooks/${encodeURIComponent(hook.id)}/deliveries`))) : [];

  return (
    <DoctorShell locale={locale} active={access.active} current="webhooks">
      <PageHeading title={t("site.doctor.nav.webhooks")} description={t("site.doctor.webhooks.intro")}>{manager && hooks && <NewWebhook />}</PageHeading>
      {!manager && <EmptyText>{t("site.doctor.webhooks.managersOnly")}</EmptyText>}
      {manager && hooks === null && <Unavailable locale={locale} title={t("site.doctor.webhooks.unavailable")} retry="/doctor/webhooks" />}
      {hooks?.length === 0 && <EmptyText>{t("site.doctor.webhooks.empty")}</EmptyText>}
      {hooks && hooks.length > 0 && (
        <div className="grid gap-3 @3xl:grid-cols-2">
          {hooks.map((hook, index) => {
            const list = deliveries[index] ?? null;
            const times = Object.fromEntries((list ?? []).map((delivery) => [delivery.id, utcDateTime(locale, delivery.created_at)]));
            return <WebhookCard key={hook.id} hook={hook} deliveries={list ?? []} deliveriesFailed={list === null} times={times} />;
          })}
        </div>
      )}
    </DoctorShell>
  );
}
