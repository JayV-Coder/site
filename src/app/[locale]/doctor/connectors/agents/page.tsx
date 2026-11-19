import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { BackLink, PageHeading } from "@/components/molecules";
import { EmptyText } from "@/components/atoms";
import { AutoRefresh } from "@/components/organisms/doctor/AutoRefresh";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { doctorList, type Schemas } from "@/modules/doctor/api";
import { agentCollections, agentState } from "@/modules/doctor/agents";
import { canManage } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../../access";
import { DoctorShell } from "../../DoctorShell";
import { Unavailable, UnavailablePage } from "../../Unavailable";
import { relative } from "../ConnectorCard";
import { AgentActions } from "./AgentActions";
import { listIntegrations } from "@/modules/doctor/lists";

type Agent = Schemas["Agent"];

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/connectors/agents">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.agents.title")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Agentes locais (#39): estado, versão, último contato e coletas para todo Papel; Owner e Admin
 * com MFA cadastram, renovam o token e revogam. */
export default async function AgentsPage({ params }: PageProps<"/[locale]/doctor/connectors/agents">) {
  const { locale } = await params;
  const [access, t] = await Promise.all([requireDoctor(locale, "/doctor/connectors/agents"), getT(locale)]);
  if (!access) return <UnavailablePage locale={locale} />;
  const [agents, integrations] = await Promise.all([
    doctorList<Agent[]>("/agents"),
    // Com as arquivadas: o card diz de qual Integração o agente é, para não confundir dois iguais.
    listIntegrations({ includeArchived: true }),
  ]);
  const names = new Map((integrations ?? []).map((item) => [item.id, item.name]));
  const manager = canManage(access.me);
  const now = new Date();

  return (
    <DoctorShell locale={locale} active={access.active} current="connectors">
      <AutoRefresh />
      <BackLink href={`/${locale}/doctor/connectors`}>{t("site.doctor.nav.connectors")}</BackLink>
      <PageHeading title={t("site.doctor.agents.title")} description={t("site.doctor.agents.intro")}>
        {manager && <Button asChild size="sm"><Link href={`/${locale}/doctor/connectors/agents/new`}><PlusIcon />{t("site.doctor.connectors.add")}</Link></Button>}
      </PageHeading>
      {agents === null && <Unavailable locale={locale} title={t("site.doctor.agents.unavailable")} retry="/doctor/connectors/agents" />}
      {agents?.length === 0 && <EmptyText>{t(manager ? "site.doctor.agents.emptyManager" : "site.doctor.agents.empty")}</EmptyText>}
      {agents && agents.length > 0 && (
        <ul className="grid gap-3 @3xl:grid-cols-2">
          {agents.map((agent) => {
            const state = agentState(agent, now);
            const collections = agentCollections(agent.config);
            return (
              <li key={agent.id}>
                <article aria-labelledby={`doctor-agent-${agent.id}`} className="grid h-full content-start gap-3 rounded-lg border border-border bg-card px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 id={`doctor-agent-${agent.id}`} className="min-w-0 font-medium break-words">{agent.name}</h2>
                    <Badge variant={state.variant}>{t(state.key)}</Badge>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    {names.has(agent.integration_id) && (<><dt className="text-muted-foreground">{t("site.doctor.connector.integration")}</dt><dd className="break-words">{names.get(agent.integration_id)}</dd></>)}
                    <dt className="text-muted-foreground">{t("site.doctor.agent.lastSeen")}</dt>
                    <dd>{agent.last_seen_at ? relative(t, locale, agent.last_seen_at, now) : t("site.doctor.agent.never")}</dd>
                    <dt className="text-muted-foreground">{t("site.doctor.agent.version")}</dt>
                    <dd className="font-mono text-xs leading-5">{agent.version ?? "—"}</dd>
                    <dt className="text-muted-foreground">{t("site.doctor.agent.collections")}</dt>
                    <dd className="break-words">
                      {collections.length === 0 ? t("site.doctor.agent.noCollections")
                        : collections.map((item) => t(`site.doctor.agent.collection.${item.kind}`, { value: item.value })).join(" · ")}
                    </dd>
                    {agent.cert_fingerprint && (<><dt className="text-muted-foreground">{t("site.doctor.agent.key")}</dt><dd className="font-mono text-xs leading-5">{agent.cert_fingerprint.slice(0, 16)}…</dd></>)}
                  </dl>
                  {/* A chave muda quando o agente se registra: o comando de um token já usado some. */}
                  {manager && agent.status !== "revoked" && <AgentActions key={`${agent.id}-${agent.status}-${agent.registered_at ?? ""}`} id={agent.id} name={agent.name} />}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </DoctorShell>
  );
}
