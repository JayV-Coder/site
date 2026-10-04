import type { Metadata } from "next";
import { EmptyText } from "@/components/atoms";
import { PageHeading } from "@/components/molecules";
import { getT } from "@/modules/i18n/server";
import { requireAccess } from "../access";
import { DashboardShell } from "../DashboardShell";
import { AdminBoard } from "./AdminBoard";
import { loadAdmin } from "./data";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/admin">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("nav.admin")} · JayV`, robots: { index: false } };
}

/** A Administração, que morava no app (v0.51.0), agora dentro do painel.
 * Quem não entrou vai ao login e volta para cá; quem entrou e não é admin vê
 * o aviso. */
export default async function AdminPage({ params }: PageProps<"/[locale]/dashboard/admin">) {
  const { locale } = await params;
  const access = await requireAccess(locale, "/dashboard/admin");
  const t = await getT(locale);
  const data = await loadAdmin();

  return (
    <DashboardShell locale={locale} access={access} current="admin">
      <PageHeading eyebrow={t("admin.eyebrow")} title={t("nav.admin")} description={t("admin.description")} />
      {data.state === "ready"
        ? <AdminBoard plans={data.plans} features={data.features} subscribers={data.subscribers} />
        : <EmptyText>{t("admin.forbidden")}</EmptyText>}
    </DashboardShell>
  );
}
