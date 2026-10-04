import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmptyText } from "@/components/atoms";
import { PageHeading } from "@/components/molecules";
import { SitePage } from "@/components/organisms/SitePage";
import { getT } from "@/modules/i18n/server";
import { AdminBoard } from "./AdminBoard";
import { loadAdmin } from "./data";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("nav.admin")} · JayV`, robots: { index: false } };
}

/** A Administração, que morava no app (v0.51.0). Quem não entrou vai ao
 * login e volta para cá; quem entrou e não é admin vê o aviso. */
export default async function AdminPage({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  const t = await getT(locale);
  const data = await loadAdmin();
  if (data.state === "signedOut") redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/admin`)}`);

  return (
    <SitePage locale={locale}>
      <div className="shell py-10">
        <PageHeading eyebrow={t("admin.eyebrow")} title={t("nav.admin")} description={t("admin.description")} />
        {data.state === "forbidden"
          ? <EmptyText>{t("admin.forbidden")}</EmptyText>
          : <AdminBoard plans={data.plans} features={data.features} subscribers={data.subscribers} />}
      </div>
    </SitePage>
  );
}
