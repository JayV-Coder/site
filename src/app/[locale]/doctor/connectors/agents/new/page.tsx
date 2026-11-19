import type { Metadata } from "next";
import Link from "next/link";
import { BackLink, PageHeading } from "@/components/molecules";
import { EmptyText } from "@/components/atoms";
import { Button } from "@/components/ui/button";
import { canManage, integrationOptions } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../../../access";
import { DoctorShell } from "../../../DoctorShell";
import { Unavailable, UnavailablePage } from "../../../Unavailable";
import { NewAgentForm } from "./NewAgentForm";
import { listIntegrations } from "@/modules/doctor/lists";


export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/connectors/agents/new">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.agents.new")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

export default async function NewAgentPage({ params }: PageProps<"/[locale]/doctor/connectors/agents/new">) {
  const { locale } = await params;
  const [access, t] = await Promise.all([requireDoctor(locale, "/doctor/connectors/agents/new"), getT(locale)]);
  if (!access) return <UnavailablePage locale={locale} />;
  const shell = (children: React.ReactNode) => (
    <DoctorShell locale={locale} active={access.active} current="connectors">
      <BackLink href={`/${locale}/doctor/connectors/agents`}>{t("site.doctor.agents.title")}</BackLink>
      {children}
    </DoctorShell>
  );
  if (!canManage(access.me)) return shell(<EmptyText>{t("site.doctor.agents.managersOnly")}</EmptyText>);
  const integrations = await listIntegrations();
  if (integrations === null) return shell(<Unavailable locale={locale} title={t("site.doctor.integrations.unavailable")} retry="/doctor/connectors/agents/new" />);
  if (integrations.length === 0) {
    return shell(
      <div className="grid justify-items-start gap-3">
        <EmptyText>{t("site.doctor.agents.needsIntegration")}</EmptyText>
        <Button asChild variant="outline"><Link href={`/${locale}/doctor/integrations`}>{t("site.doctor.nav.integrations")}</Link></Button>
      </div>,
    );
  }
  return shell(
    <>
      <PageHeading title={t("site.doctor.agents.new")} />
      <NewAgentForm integrations={integrationOptions(t, integrations)} />
    </>,
  );
}
