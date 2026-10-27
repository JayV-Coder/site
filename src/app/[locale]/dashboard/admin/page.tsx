import type { Metadata } from "next";
import { EmptyText } from "@/components/atoms";
import { PageHeading } from "@/components/molecules";
import { getT } from "@/modules/i18n/server";
import { requireAccess } from "../access";
import { DashboardShell } from "../DashboardShell";
import { AdminBoard } from "./AdminBoard";
import { ADMIN_TABS } from "./tabs";
import { loadAdmin } from "./data";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/admin">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("nav.admin")} · JayV`, robots: { index: false } };
}

/** A Administração, que morava no app (v0.51.0), agora dentro do painel,
 * com a tabela de preços, o custo do Jev e o uso dos recursos (app 0.110.0).
 * Quem não entrou vai ao login e volta para cá; quem entrou e não é admin vê
 * o aviso. */
export default async function AdminPage({ params, searchParams }: PageProps<"/[locale]/dashboard/admin">) {
  const { locale } = await params;
  // `?tab=` abre uma aba (o Ctrl+K do app leva direto a Preços, Custo do Jev e Uso dos recursos).
  const query = await searchParams;
  const tab = ADMIN_TABS.find((known) => known === query.tab) ?? "features";
  const access = await requireAccess(locale, "/dashboard/admin");
  const t = await getT(locale);
  const data = await loadAdmin();

  return (
    <DashboardShell locale={locale} access={access} current="admin">
      <PageHeading eyebrow={t("admin.eyebrow")} title={t("nav.admin")} description={t("admin.description")} />
      {data.state === "ready"
        ? <AdminBoard plans={data.plans} features={data.features} subscribers={data.subscribers}
          prices={data.prices} jevCosts={data.jevCosts} featureUsage={data.featureUsage} tab={tab} />
        : <EmptyText>{t("admin.forbidden")}</EmptyText>}
    </DashboardShell>
  );
}
