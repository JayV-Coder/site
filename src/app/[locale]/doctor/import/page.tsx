import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/molecules";
import { EmptyText } from "@/components/atoms";
import { AutoRefresh } from "@/components/organisms/doctor/AutoRefresh";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { doctorList, type Schemas } from "@/modules/doctor/api";
import { importBadge, needsRefresh } from "@/modules/doctor/imports";
import { integrationOptions, isOperator, utcDateTime } from "@/modules/doctor/labels";
import type { Key } from "@/modules/i18n";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { Unavailable, UnavailablePage } from "../Unavailable";
import { ImportUploader } from "./ImportUploader";
import { listIntegrations } from "@/modules/doctor/lists";

type Import = Schemas["Import"];

const DOWNLOAD_FAILURES: Record<string, Key> = {
  missing: "site.doctor.import.error.rejectionsMissing",
  unavailable: "site.doctor.report.error.unavailable",
};

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/import">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.nav.import")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Tela 13: a Importação manual (JSON, NDJSON ou CSV) com o mapeamento de colunas por
 * Integração (#11), e as Importações recentes com as linhas recusadas para baixar. */
export default async function ImportPage({ params, searchParams }: PageProps<"/[locale]/doctor/import">) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const access = await requireDoctor(locale, "/doctor/import");
  const t = await getT(locale);
  if (!access) return <UnavailablePage locale={locale} />;
  const canImport = isOperator(access.me.active_role);
  const [integrations, imports] = await Promise.all([
    // Com as arquivadas: a lista de Importações mostra de qual Integração veio cada uma.
    listIntegrations({ includeArchived: true }),
    doctorList<Import[]>("/imports"),
  ]);
  const failure = DOWNLOAD_FAILURES[typeof query.download === "string" ? query.download : ""];
  const active = integrations?.filter((item) => !item.archived_at) ?? null;
  const names = new Map((integrations ?? []).map((item) => [item.id, item.name]));
  const number = new Intl.NumberFormat(locale);

  return (
    <DoctorShell locale={locale} active={access.active} current="import">
      {imports && needsRefresh(imports, new Date()) && <AutoRefresh seconds={5} />}
      <PageHeading title={t("site.doctor.nav.import")} description={t("site.doctor.import.intro")} />
      {failure && <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">{t(failure)}</p>}
      <div className="grid gap-6">
        {canImport && integrations === null && <Unavailable locale={locale} title={t("site.doctor.integrations.unavailable")} retry="/doctor/import" />}
        {canImport && active?.length === 0 && (
          <div className="grid justify-items-start gap-3">
            <EmptyText>{t("site.doctor.import.needsIntegration")}</EmptyText>
            <Button asChild variant="outline"><Link href={`/${locale}/doctor/integrations`}>{t("site.doctor.nav.integrations")}</Link></Button>
          </div>
        )}
        {canImport && active && active.length > 0 && (
          <ImportUploader integrations={integrationOptions(t, active)} />
        )}
        {!canImport && <p className="text-sm text-muted-foreground">{t("site.doctor.import.viewerHint")}</p>}

        <section aria-labelledby="doctor-imports" className="grid gap-2">
          <h2 id="doctor-imports" className="text-sm font-medium">{t("site.doctor.import.recent")}</h2>
          {imports === null && <p className="text-sm text-muted-foreground">{t("site.doctor.import.unavailable")}</p>}
          {imports?.length === 0 && <p className="text-sm text-muted-foreground">{t("site.doctor.import.none")}</p>}
          {imports && imports.length > 0 && (
            <ul className="grid gap-2">
              {imports.map((item) => {
                const badge = importBadge(item.status);
                return (
                  <li key={item.id} className="grid gap-1.5 rounded-lg border border-border bg-card px-4 py-3">
                    <span className="flex flex-wrap items-start justify-between gap-2">
                      <span className="min-w-0 font-mono text-xs break-all">{item.filename}</span>
                      <Badge variant={badge.variant}>{t(badge.key)}</Badge>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {[names.get(item.integration_id), utcDateTime(locale, item.created_at)].filter(Boolean).join(" · ")}
                    </span>
                    {/* O motivo vem da API ou do worker como está. */}
                    {item.error && <p className="text-sm break-words">{item.error}</p>}
                    {item.status === "done" && (
                      <p className="text-sm">{t("site.doctor.import.summary", {
                        total: number.format(item.total_lines), accepted: number.format(item.accepted), rejected: number.format(item.rejected),
                        duplicates: number.format(item.duplicates), secrets: number.format(item.secrets_removed),
                      })}</p>
                    )}
                    {item.rejected > 0 && (
                      <Button asChild variant="outline" size="sm" className="justify-self-start">
                        <a href={`/${locale}/doctor/import/${item.id}/rejections`}>{t("site.doctor.import.rejections", { count: item.rejected })}</a>
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </DoctorShell>
  );
}
