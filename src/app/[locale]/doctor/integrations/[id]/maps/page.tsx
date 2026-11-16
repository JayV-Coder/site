import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink, PageHeading } from "@/components/molecules";
import { EmptyText } from "@/components/atoms";
import { Badge } from "@/components/ui/badge";
import { doctorGet, doctorList, type Schemas } from "@/modules/doctor/api";
import { systemName } from "@/modules/doctor/diagnosis";
import { keyParts, type MappingKey } from "@/modules/doctor/integrations";
import { canManage } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../../../access";
import { DoctorShell } from "../../../DoctorShell";
import { Unavailable, UnavailablePage } from "../../../Unavailable";
import { DeleteMapping } from "./DeleteMapping";
import { NewMapping } from "./NewMapping";

type Integration = Schemas["Integration"];
type CorrelationMapping = Schemas["CorrelationMapping"];
type Connector = Schemas["Connector"];

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/integrations/[id]/maps">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.integrations.maps")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Mapas entre sistemas (#40): onde cada sistema guarda a mesma chave, para a Timeline juntar
 * Salesforce, middleware e SAP numa Execução. Todo Papel vê; Owner e Admin com MFA mudam. */
export default async function MapsPage({ params }: PageProps<"/[locale]/doctor/integrations/[id]/maps">) {
  const { locale, id } = await params;
  const access = await requireDoctor(locale, `/doctor/integrations/${id}/maps`);
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const manager = canManage(access.me);
  const [integrations, mappings, connectors] = await Promise.all([
    doctorList<Integration[]>("/integrations"),
    doctorGet<CorrelationMapping[]>(`/integrations/${encodeURIComponent(id)}/correlation-mappings`),
    manager ? doctorList<Connector[]>("/connectors") : null,
  ]);
  if (mappings === "not_found") notFound();
  const integration = integrations?.find((item) => item.id === id);
  const back = <BackLink href={`/${locale}/doctor/integrations`}>{t("site.doctor.nav.integrations")}</BackLink>;
  if (mappings === null || !integration) {
    return (
      <DoctorShell locale={locale} active={access.active} current="integrations">
        {back}
        <Unavailable locale={locale} title={t("site.doctor.maps.unavailable")} retry={`/doctor/integrations/${id}/maps`} />
      </DoctorShell>
    );
  }
  const name = (found: { name: string } | { key: Parameters<typeof t>[0] }) => ("name" in found ? found.name : t(found.key));
  // A consulta no destino (#40) usa um Conector de leitura: Salesforce ou OData (SAP).
  const lookups = (connectors ?? []).filter((item) => item.provider === "salesforce" || item.provider === "odata").map(({ id: connector, name: label }) => ({ id: connector, name: label }));

  return (
    <DoctorShell locale={locale} active={access.active} current="integrations">
      {back}
      <PageHeading title={t("site.doctor.integrations.maps")}
        description={`${integration.name} · ${name(systemName(integration.source_system))} → ${name(systemName(integration.target_system))}`}>
        {manager && <NewMapping integration={id} source={integration.source_system} target={integration.target_system} connectors={lookups} />}
      </PageHeading>
      {mappings.length === 0 && <EmptyText>{t(manager ? "site.doctor.maps.emptyManager" : "site.doctor.maps.empty")}</EmptyText>}
      <ul className="grid gap-3 @3xl:grid-cols-2">
        {mappings.map((mapping) => (
          <li key={mapping.id}>
            <article aria-labelledby={`doctor-map-${mapping.id}`} className="grid h-full content-start gap-3 rounded-lg border border-border bg-card px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 id={`doctor-map-${mapping.id}`} className="min-w-0 font-medium break-words">{mapping.name}</h2>
                <span className="flex flex-wrap gap-1">
                  {mapping.reconcile && <Badge variant="secondary">{t("site.doctor.maps.reconcile")}</Badge>}
                  {mapping.lookup && <Badge variant="secondary">{t("site.doctor.maps.lookup")}</Badge>}
                </span>
              </div>
              <ul className="grid gap-1 text-sm">
                {(mapping.keys as MappingKey[]).map((key, index) => {
                  const parts = keyParts(key);
                  const steps = parts.steps.map((step) => t(step.key, step.value === undefined ? undefined : { value: step.value }));
                  return (
                    <li key={index} className="break-words">
                      {name(parts.system)} · <span className="font-mono text-xs">{parts.field}</span>
                      {steps.length > 0 && <span className="text-muted-foreground"> ({steps.join(", ")})</span>}
                    </li>
                  );
                })}
              </ul>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">{t("site.doctor.maps.window")}</dt>
                <dd>{t("site.doctor.maps.minutes", { count: mapping.window_minutes })}</dd>
                {mapping.lookup && (<>
                  <dt className="text-muted-foreground">{t("site.doctor.maps.lookup")}</dt>
                  <dd className="font-mono text-xs leading-5 break-all">{String(mapping.lookup.entity)} · {String(mapping.lookup.field)}</dd>
                </>)}
              </dl>
              {manager && <DeleteMapping id={mapping.id} name={mapping.name} />}
            </article>
          </li>
        ))}
      </ul>
    </DoctorShell>
  );
}
