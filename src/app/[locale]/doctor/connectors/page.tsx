import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/molecules";
import { EmptyText } from "@/components/atoms";
import { AutoRefresh } from "@/components/organisms/doctor/AutoRefresh";
import { Button } from "@/components/ui/button";
import { doctorList, type Schemas } from "@/modules/doctor/api";
import { canManage } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { Unavailable, UnavailablePage } from "../Unavailable";
import { ConnectorSummary } from "./ConnectorCard";
import { ConnectorAction, TestConnection } from "./ConnectorControls";

type Connector = Schemas["Connector"];

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/connectors">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.nav.connectors")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Tela 11: um card por Conector. Todo Papel vê; só Owner e Admin com MFA agem. */
export default async function ConnectorsPage({ params }: PageProps<"/[locale]/doctor/connectors">) {
  const { locale } = await params;
  const access = await requireDoctor(locale, "/doctor/connectors");
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const connectors = await doctorList<Connector[]>("/connectors");
  const manager = canManage(access.me);
  const now = new Date();

  return (
    <DoctorShell locale={locale} active={access.active} current="connectors">
      {/* O status muda com as Sincronizações: a página relê pela API. */}
      <AutoRefresh />
      <PageHeading title={t("site.doctor.nav.connectors")} description={t("site.doctor.connectors.intro")} />
      {connectors === null && <Unavailable locale={locale} title={t("site.doctor.connectors.unavailable")} retry="/doctor/connectors" />}
      {connectors?.length === 0 && <EmptyText>{t(manager ? "site.doctor.connectors.emptyManager" : "site.doctor.connectors.empty")}</EmptyText>}
      {connectors && connectors.length > 0 && (
        <ul className="grid gap-3 @3xl:grid-cols-2">
          {connectors.map((connector) => {
            const paused = connector.status === "paused";
            return (
              <li key={connector.id}>
                <ConnectorSummary locale={locale} connector={connector} now={now} headingId={`doctor-connector-${connector.id}`}
                  actions={manager && connector.status !== "disabled" && (
                    <div className="flex flex-wrap items-start gap-2">
                      <TestConnection id={connector.id} name={connector.name} provider={connector.provider} primary={connector.status === "failing"} />
                      <ConnectorAction key={paused ? "resume" : "sync"} id={connector.id} action={paused ? "resume" : "sync"} />
                    </div>
                  )}>
                  <Button asChild variant="ghost" size="sm" className="justify-self-start">
                    <Link href={`/${locale}/doctor/connectors/${connector.id}`}>{t("site.doctor.connectors.history")}</Link>
                  </Button>
                </ConnectorSummary>
              </li>
            );
          })}
        </ul>
      )}
    </DoctorShell>
  );
}
