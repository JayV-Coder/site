import type { Metadata } from "next";
import Link from "next/link";
import { BackLink, LinkSegments, PageHeading } from "@/components/molecules";
import { EmptyText } from "@/components/atoms";
import { Button } from "@/components/ui/button";
import type { Schemas } from "@/modules/doctor/api";
import { canManage, integrationOptions } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../../access";
import { DoctorShell } from "../../DoctorShell";
import { Unavailable, UnavailablePage } from "../../Unavailable";
import { GcpWizard } from "./GcpWizard";
import { SalesforceWizard } from "./SalesforceWizard";
import { listIntegrations } from "@/modules/doctor/lists";

type Integration = Schemas["Integration"];

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/connectors/new">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.wizard.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Tela 12: o assistente do Conector em 4 passos, do Google Cloud (padrão) ou do Salesforce (#37). */
export default async function NewConnectorPage({ params, searchParams }: PageProps<"/[locale]/doctor/connectors/new">) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const salesforce = query.provider === "salesforce";
  const access = await requireDoctor(locale, `/doctor/connectors/new${salesforce ? "?provider=salesforce" : ""}`);
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const back = <BackLink href={`/${locale}/doctor/connectors`}>{t("site.doctor.nav.connectors")}</BackLink>;
  const shell = (children: React.ReactNode) => (
    <DoctorShell locale={locale} active={access.active} current="connectors">{back}{children}</DoctorShell>
  );
  if (!canManage(access.me)) return shell(<EmptyText>{t("site.doctor.wizard.managersOnly")}</EmptyText>);
  const integrations = await listIntegrations();
  if (integrations === null) return shell(<Unavailable locale={locale} title={t("site.doctor.integrations.unavailable")} retry="/doctor/connectors/new" />);
  if (integrations.length === 0) {
    return shell(
      <div className="grid justify-items-start gap-3">
        <EmptyText>{t("site.doctor.wizard.needsIntegration")}</EmptyText>
        <Button asChild variant="outline"><Link href={`/${locale}/doctor/integrations`}>{t("site.doctor.nav.integrations")}</Link></Button>
      </div>,
    );
  }
  const options = integrationOptions(t, integrations);
  const base = `/${locale}/doctor/connectors/new`;
  return shell(
    <>
      <PageHeading title={t("site.doctor.wizard.title")}>
        <LinkSegments label={t("site.doctor.wizard.provider")} options={[
          { href: base, label: "Google Cloud", current: !salesforce },
          { href: `${base}?provider=salesforce`, label: "Salesforce", current: salesforce },
        ]} />
      </PageHeading>
      {salesforce
        ? <SalesforceWizard integrations={options} />
        : <GcpWizard tenantId={access.active.id} integrations={options} />}
    </>,
  );
}
