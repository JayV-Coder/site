import type { Metadata } from "next";
import { LinkSegments, PageHeading } from "@/components/molecules";
import { EmptyText } from "@/components/atoms";
import { AUDIT_CATEGORIES, readCategory } from "@/modules/doctor/audit";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { RenewAccess } from "../members/RenewAccess";
import { Unavailable, UnavailablePage } from "../Unavailable";
import { findAudit } from "./actions";
import { AuditList } from "./AuditList";

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/audit">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.nav.audit")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Tela 18: a Trilha de auditoria, para Owner e Admin com MFA. A categoria fica na URL; o termo
 * de busca, não (pode ser o e-mail de alguém). */
export default async function AuditPage({ params, searchParams }: PageProps<"/[locale]/doctor/audit">) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const category = readCategory(query.category);
  const path = `/doctor/audit${category ? `?category=${category}` : ""}`;
  const [access, t] = await Promise.all([requireDoctor(locale, path), getT(locale)]);
  if (!access) return <UnavailablePage locale={locale} />;
  const page = await findAudit(category, null, null);
  const base = `/${locale}/doctor/audit`;
  const exported = query.export === "failed" || query.export === "forbidden" ? query.export : null;

  return (
    <DoctorShell locale={locale} active={access.active} current="audit">
      <PageHeading title={t("site.doctor.nav.audit")} description={t("site.doctor.audit.intro")} />
      <div className="grid gap-4">
        <LinkSegments label={t("site.doctor.audit.categories")} options={[
          { href: base, label: t("site.doctor.audit.category.all"), current: category === null },
          ...AUDIT_CATEGORIES.map((value) => ({ href: `${base}?category=${value}`, label: t(`site.doctor.audit.category.${value}`), current: category === value })),
        ]} />
        {exported && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">{t(exported === "forbidden" ? "site.doctor.audit.forbidden" : "site.doctor.audit.exportFailed")}</p>}
        {page === "forbidden" && (
          <div className="grid justify-items-start gap-3">
            <EmptyText>{t("site.doctor.audit.forbidden")}</EmptyText>
            <RenewAccess />
          </div>
        )}
        {page === null && <Unavailable locale={locale} title={t("site.doctor.audit.unavailable")} retry={path} />}
        {page !== null && page !== "forbidden" && <AuditList key={category ?? "all"} locale={locale} category={category} initial={page} />}
        <p className="text-xs text-muted-foreground">{t("site.doctor.audit.retention")}</p>
      </div>
    </DoctorShell>
  );
}
