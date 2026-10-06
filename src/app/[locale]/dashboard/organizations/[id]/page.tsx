import type { Metadata } from "next";
import { EmptyText } from "@/components/atoms";
import { BackLink, PageHeading } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import type { Key } from "@/modules/i18n";
import { getT } from "@/modules/i18n/server";
import { requireAccess } from "../../access";
import { DashboardShell } from "../../DashboardShell";
import { loadOrganization } from "../data";
import { OrganizationBoard, type OrganizationTab } from "./OrganizationBoard";
import type { GitOutcome } from "./RepositoriesSection";

const TABS: OrganizationTab[] = ["members", "repositories", "policy", "permissions", "mcp", "skills", "settings"];
const OUTCOMES: GitOutcome[] = ["connected", "denied", "requested", "forbidden", "failed"];

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/organizations/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("nav.organizations")} · JayV`, robots: { index: false } };
}

/** Uma organização no painel: o convite de membros, os repositórios (pelo
 * provedor git do owner) e a política de LLM. O resto (papéis, projetos,
 * estatísticas e o clone dos repositórios) continua no app. `?tab=` abre uma
 * aba; `?git=` é a volta do provedor (`/api/git/callback`). */
export default async function OrganizationPage({ params, searchParams }: PageProps<"/[locale]/dashboard/organizations/[id]">) {
  const { locale, id } = await params;
  const query = await searchParams;
  const tab = TABS.find((known) => known === query.tab) ?? "members";
  const kind = OUTCOMES.find((known) => known === query.git);
  const outcome = kind ? { kind, provider: typeof query.provider === "string" ? query.provider : null, pick: query.pick === "1", chosen: query.chosen === "1" } : null;
  const access = await requireAccess(locale, `/dashboard/organizations/${id}`);
  const t = await getT(locale);
  // O id vem do endereço: um texto que não é uuid nem chega ao banco.
  const detail = /^[0-9a-f-]{36}$/i.test(id) ? await loadOrganization(id) : null;
  const back = <BackLink href={`/${locale}/dashboard/organizations`}>{t("org.back")}</BackLink>;

  return (
    <DashboardShell locale={locale} access={access} current="organizations">
      <div className="mb-4">{back}</div>
      {!detail ? <EmptyText>{t("site.org.notFound")}</EmptyText> : (
        <>
          <PageHeading title={detail.organization.name}
            description={(
              <span className="flex items-center gap-2">
                <span className="font-mono">@{detail.organization.slug}</span>
                <Badge variant="outline">{t(`org.role.${detail.organization.role}` as Key)}</Badge>
              </span>
            )} />
          <OrganizationBoard detail={detail} tab={tab} outcome={outcome} />
        </>
      )}
    </DashboardShell>
  );
}
