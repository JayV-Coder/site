import type { Metadata } from "next";
import { PageHeading } from "@/components/molecules";
import { EmptyText } from "@/components/atoms";
import { doctorList, type Schemas } from "@/modules/doctor/api";
import { ruleChannelKinds, ruleWhen, toQuiet } from "@/modules/doctor/alerts";
import { canManage, environmentKey } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import type { Key } from "@/modules/i18n";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { Unavailable, UnavailablePage } from "../Unavailable";
import { Channels } from "./Channels";
import { MyChannels } from "./MyChannels";
import { NewRule } from "./NewRule";
import { RuleCard } from "./RuleCard";
import { listIntegrations } from "@/modules/doctor/lists";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/alerts">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.nav.alerts")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Tela 20: as regras com interruptor, os canais da Organização e, de quem olha, o push e o
 * silêncio. Todo Papel vê as regras; só Owner e Admin com MFA mudam. */
export default async function AlertsPage({ params }: PageProps<"/[locale]/doctor/alerts">) {
  const { locale } = await params;
  const access = await requireDoctor(locale, "/doctor/alerts");
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const [rules, channels, subscriptions, preferences, key, integrations] = await Promise.all([
    doctorList<Schemas["AlertRule"][]>("/alert-rules"),
    doctorList<Schemas["Channel"][]>("/notification-channels"),
    doctorList<Schemas["PushSubscription"][]>("/push-subscriptions"),
    doctorList<Schemas["Preferences"]>("/alert-preferences"),
    doctorList<Schemas["PushKey"]>("/push/key"),
    listIntegrations(),
  ]);
  const manager = canManage(access.me);
  const loaded = rules && channels && subscriptions && preferences;
  const words = {
    environment: (value: string) => { const found = environmentKey(value); return found ? t(found) : value; },
    allEnvironments: t("site.doctor.alerts.allEnvironments"),
    allIntegrations: t("site.doctor.alerts.allIntegrations"),
    integration: t("site.doctor.alerts.integrationFallback"),
    severity: (value: string) => (["critical", "high", "medium", "low"].includes(value) ? t(`site.doctor.alerts.severity.${value}` as Key) : value),
  };
  const named = (integrations ?? []).map(({ id, name }) => ({ id, name }));

  return (
    <DoctorShell locale={locale} active={access.active} current="alerts">
      <PageHeading title={t("site.doctor.nav.alerts")} description={t("site.doctor.alerts.intro")}>
        {manager && loaded && <NewRule channels={channels.map(({ id, name }) => ({ id, name }))} />}
      </PageHeading>
      {!loaded ? <Unavailable locale={locale} title={t("site.doctor.alerts.unavailable")} retry="/doctor/alerts" /> : (
        <div className="grid gap-6">
          <section aria-labelledby="doctor-alert-rules" className="grid gap-3">
            <h2 id="doctor-alert-rules" className="text-sm font-medium text-muted-foreground">{t("site.doctor.alerts.rules")}</h2>
            {rules.length === 0 && <EmptyText>{t(manager ? "site.doctor.alerts.emptyManager" : "site.doctor.alerts.empty")}</EmptyText>}
            <div className="grid gap-3 @3xl:grid-cols-2">
              {rules.map((rule) => {
                const when = ruleWhen(rule.conditions, named, words);
                const kinds = ruleChannelKinds(rule.channels, channels);
                return (
                  <RuleCard key={rule.id} id={rule.id} name={rule.name} enabled={rule.enabled} manager={manager}
                    when={t(when.key as Key, when.params)}
                    send={kinds.length > 0 ? kinds.map((kind) => t(`site.doctor.alerts.channel.kind.${kind}` as Key)).join(", ") : t("site.doctor.alerts.noChannel")} />
                );
              })}
            </div>
          </section>
          <section aria-labelledby="doctor-alert-mine" className="grid gap-3">
            <h2 id="doctor-alert-mine" className="text-sm font-medium text-muted-foreground">{t("site.doctor.alerts.mine")}</h2>
            <MyChannels pushKey={key?.public_key ?? null} subscriptions={subscriptions.map(({ id, endpoint }) => ({ id, endpoint }))} quiet={toQuiet(preferences.quiet_hours)} />
          </section>
          {manager && (
            <section aria-labelledby="doctor-alert-org" className="grid gap-3">
              <h2 id="doctor-alert-org" className="text-sm font-medium text-muted-foreground">{t("site.doctor.alerts.orgChannels")}</h2>
              <Channels channels={channels} />
            </section>
          )}
        </div>
      )}
    </DoctorShell>
  );
}
