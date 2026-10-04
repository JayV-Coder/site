import type { Metadata } from "next";
import Link from "next/link";
import { EmptyText } from "@/components/atoms";
import { PageHeading } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import type { Key } from "@/modules/i18n";
import { getT } from "@/modules/i18n/server";
import { requireAccess } from "../access";
import { DashboardShell } from "../DashboardShell";
import { loadOrganizations } from "./data";
import { NewOrganizationForm } from "./NewOrganizationForm";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/organizations">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("nav.organizations")} · JayV`, robots: { index: false } };
}

/** As organizações de quem entrou, e a criação de uma nova — que saíram do
 * app para cá. Sem o recurso no plano, fica o aviso, como o menu do app. */
export default async function OrganizationsPage({ params }: PageProps<"/[locale]/dashboard/organizations">) {
  const { locale } = await params;
  const access = await requireAccess(locale, "/dashboard/organizations");
  const t = await getT(locale);
  const allowed = access.organizations || access.admin;
  const list = allowed ? await loadOrganizations() : [];

  return (
    <DashboardShell locale={locale} access={access} current="organizations">
      <PageHeading eyebrow={t("site.dashboard.title")} title={t("nav.organizations")} description={t("site.dashboard.organizations")} />
      {!allowed ? <EmptyText>{t("site.dashboard.locked")}</EmptyText> : (
        <div className="grid gap-6">
          <NewOrganizationForm />
          {list.length === 0
            ? <EmptyText>{t("org.list.empty")}</EmptyText>
            : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                {list.map((org) => (
                  <li key={org.id}>
                    <Link href={`/${locale}/dashboard/organizations/${org.id}`}
                      className="grid h-full gap-1.5 rounded-lg border border-border bg-card px-5 py-4 transition-colors hover:border-muted-foreground/50 hover:bg-secondary/40">
                      <span className="text-lg font-semibold break-words">{org.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">@{org.slug}</span>
                      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{t(`org.role.${org.role}` as Key)}</Badge>
                        <span>{t("org.count.members", { count: org.members })}</span>
                        <span aria-hidden="true">·</span>
                        <span>{t("org.count.repositories", { count: org.repositories })}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}
    </DashboardShell>
  );
}
