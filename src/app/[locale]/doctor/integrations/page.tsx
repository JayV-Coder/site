import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/molecules";
import { EmptyText } from "@/components/atoms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { systemName } from "@/modules/doctor/diagnosis";
import { environmentVariant } from "@/modules/doctor/integrations";
import { canManage, environmentKey, nameOf } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { Unavailable, UnavailablePage } from "../Unavailable";
import { ArchiveIntegration } from "./ArchiveIntegration";
import { DeleteIntegration } from "./DeleteIntegration";
import { EditIntegration } from "./EditIntegration";
import { NewIntegration } from "./NewIntegration";
import { listIntegrations } from "@/modules/doctor/lists";


export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/integrations">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.nav.integrations")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Tela 10: os fluxos de negócio monitorados, em cards; Owner e Admin (com MFA) cadastram,
 * editam, arquivam e excluem (só a sem histórico). */
export default async function IntegrationsPage({ params }: PageProps<"/[locale]/doctor/integrations">) {
  const { locale } = await params;
  const access = await requireDoctor(locale, "/doctor/integrations");
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const integrations = await listIntegrations();
  const manager = canManage(access.me);
  const system = (value: string) => nameOf(t, systemName(value));
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });

  return (
    <DoctorShell locale={locale} active={access.active} current="integrations">
      <PageHeading title={t("site.doctor.nav.integrations")} description={t("site.doctor.integrations.intro")}>
        {manager && <NewIntegration />}
      </PageHeading>
      {integrations === null && <Unavailable locale={locale} title={t("site.doctor.integrations.unavailable")} retry="/doctor/integrations" />}
      {integrations?.length === 0 && <EmptyText>{t(manager ? "site.doctor.integrations.emptyManager" : "site.doctor.integrations.empty")}</EmptyText>}
      {integrations && integrations.length > 0 && (
        <ul className="grid gap-3 @3xl:grid-cols-2">
          {integrations.map((integration) => {
            const environment = environmentKey(integration.environment);
            return (
              <li key={integration.id}>
                <article aria-labelledby={`doctor-integration-${integration.id}`} className="grid h-full content-start gap-3 rounded-lg border border-border bg-card px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 id={`doctor-integration-${integration.id}`} className="min-w-0 font-medium break-words">{integration.name}</h2>
                    <Badge variant={environmentVariant(integration.environment)}>{environment ? t(environment) : integration.environment}</Badge>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">{t("site.doctor.integrations.errorRate")}</dt>
                    {/* Sem Execução não há taxa: mostrar 0% passaria a ideia de que está tudo bem. */}
                    <dd>{integration.error_rate_24h == null ? t("site.doctor.integrations.noExecutions") : percent.format(integration.error_rate_24h)}</dd>
                    <dt className="text-muted-foreground">{t("site.doctor.integrations.flow")}</dt>
                    <dd>{system(integration.source_system)} → {system(integration.target_system)}</dd>
                    {integration.owner_team && (<><dt className="text-muted-foreground">{t("site.doctor.integrations.team")}</dt><dd className="break-words">{integration.owner_team}</dd></>)}
                  </dl>
                  {integration.description && <p className="text-sm break-words text-muted-foreground">{integration.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm"><Link href={`/${locale}/doctor/integrations/${integration.id}/maps`}>{t("site.doctor.integrations.maps")}</Link></Button>
                    {manager && <EditIntegration integration={integration} />}
                    {manager && <ArchiveIntegration id={integration.id} name={integration.name} />}
                    {/* Excluir só sem histórico nem configuração ligada; nas outras, arquivar. */}
                    {manager && integration.deletable && <DeleteIntegration id={integration.id} name={integration.name} />}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </DoctorShell>
  );
}
