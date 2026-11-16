import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { doctorList, type Schemas } from "@/modules/doctor/api";
import { jiraState, serviceNowState } from "@/modules/doctor/itsm";
import { canManage } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { Unavailable, UnavailablePage } from "../Unavailable";
import { ConnectJira, JiraConfig } from "./JiraConfig";
import { ServiceNowConfig } from "./ServiceNowConfig";

type JiraConnection = Schemas["JiraConnection"];
type ServiceNowConnection = Schemas["ServiceNowConnection"];

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/tickets">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.nav.tickets")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Tela 21 (#43, #44): Jira Service Management, ServiceNow e o webhook genérico. Todo Papel vê o
 * estado; Owner e Admin com MFA conectam e configuram. */
export default async function TicketsPage({ params, searchParams }: PageProps<"/[locale]/doctor/tickets">) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const access = await requireDoctor(locale, "/doctor/tickets");
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  // A API devolve `null` sem conexão; sem resposta, o `doctorList` também dá nulo. O `ok` separa.
  const [jira, servicenow] = await Promise.all([
    doctorList<JiraConnection | null>("/itsm/jira").then((value) => ({ ok: true as const, value })).catch(() => ({ ok: false as const })),
    doctorList<ServiceNowConnection | null>("/itsm/servicenow").then((value) => ({ ok: true as const, value })).catch(() => ({ ok: false as const })),
  ]);
  const manager = canManage(access.me);
  const jiraConnection = jira.ok ? jira.value : null;
  const snConnection = servicenow.ok ? servicenow.value : null;
  const jiraBadge = jiraState(jiraConnection);
  const snBadge = serviceNowState(snConnection);
  const box = "grid content-start gap-3 rounded-lg border border-border bg-card px-4 py-4";
  const result = typeof query.jira === "string" ? query.jira : null;

  return (
    <DoctorShell locale={locale} active={access.active} current="tickets">
      <PageHeading title={t("site.doctor.nav.tickets")} description={t("site.doctor.itsm.intro")} />
      {result === "connected" && <p role="status" className="mb-4 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm">{t("site.doctor.itsm.jiraConnected")}</p>}
      {result === "failed" && <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">{t("site.doctor.itsm.jiraFailed")}</p>}
      {(!jira.ok || !servicenow.ok) && <Unavailable locale={locale} title={t("site.doctor.itsm.unavailable")} retry="/doctor/tickets" />}
      <div className="grid gap-4 @4xl:grid-cols-2">
        <section aria-labelledby="doctor-jira" className={box}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="doctor-jira" className="font-medium">Jira Service Management</h2>
            <Badge variant={jiraBadge.variant}>{t(jiraBadge.key)}</Badge>
          </div>
          {jiraConnection?.project_key && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">{t("site.doctor.itsm.project")}</dt>
              <dd className="font-mono text-xs leading-5">{jiraConnection.project_key} · {jiraConnection.issue_type}</dd>
            </dl>
          )}
          {/* O erro vem do Jira como está. */}
          {jiraConnection?.last_error && <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm break-words">{jiraConnection.last_error}</p>}
          {manager && jira.ok && (!jiraConnection || jiraConnection.status === "needs_reauth") && <ConnectJira again={Boolean(jiraConnection)} />}
          {manager && jiraConnection && jiraConnection.status !== "needs_reauth" && <JiraConfig connection={jiraConnection} />}
          {!manager && !jiraConnection && <p className="text-sm text-muted-foreground">{t("site.doctor.itsm.askJira")}</p>}
        </section>

        <section aria-labelledby="doctor-servicenow" className={box}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="doctor-servicenow" className="font-medium">ServiceNow</h2>
            <Badge variant={snBadge.variant}>{t(snBadge.key)}</Badge>
          </div>
          {snConnection?.instance_url && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">{t("site.doctor.itsm.instance")}</dt>
              <dd className="font-mono text-xs leading-5 break-all">{snConnection.instance_url.replace("https://", "")}</dd>
            </dl>
          )}
          {snConnection?.last_error && <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm break-words">{snConnection.last_error}</p>}
          {manager && servicenow.ok && <ServiceNowConfig connection={snConnection} />}
          {!manager && !snConnection && <p className="text-sm text-muted-foreground">{t("site.doctor.itsm.askServiceNow")}</p>}
        </section>

        <section aria-labelledby="doctor-generic-webhook" className={box}>
          <h2 id="doctor-generic-webhook" className="font-medium">{t("site.doctor.itsm.webhook")}</h2>
          <p className="text-sm text-muted-foreground">{t("site.doctor.itsm.webhookHint")}</p>
          {manager && <Button asChild variant="outline" size="sm" className="justify-self-start"><Link href={`/${locale}/doctor/webhooks`}>{t("site.doctor.itsm.webhooks")}</Link></Button>}
        </section>
      </div>
    </DoctorShell>
  );
}
