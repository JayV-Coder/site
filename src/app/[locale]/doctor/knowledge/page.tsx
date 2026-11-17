import type { Metadata } from "next";
import { LinkSegments, PageHeading } from "@/components/molecules";
import { AutoRefresh } from "@/components/organisms/doctor/AutoRefresh";
import { Badge } from "@/components/ui/badge";
import { doctorList, type Schemas } from "@/modules/doctor/api";
import { documentKind, documentState, needsRefresh } from "@/modules/doctor/knowledge";
import { isOperator } from "@/modules/doctor/labels";
import { getT } from "@/modules/i18n/server";
import { requireDoctor } from "../access";
import { DoctorShell } from "../DoctorShell";
import { Unavailable, UnavailablePage } from "../Unavailable";
import { DeleteDocument } from "./DeleteDocument";
import { KnowledgeSearch } from "./KnowledgeSearch";
import { UploadDocument } from "./UploadDocument";

type KnowledgeDocument = Schemas["KnowledgeDocument"];
type GlobalDocument = Schemas["GlobalDocument"];

export async function generateMetadata({ params }: PageProps<"/[locale]/doctor/knowledge">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.doctor.nav.knowledge")} · ${t("site.doctor.name")}`, robots: { index: false } };
}

/** Tela 14: os documentos que o Diagnóstico consulta (da Organização e a Base global curada),
 * a busca e o envio de documentos. */
export default async function KnowledgePage({ params, searchParams }: PageProps<"/[locale]/doctor/knowledge">) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const global = query.tab === "global";
  const [access, t] = await Promise.all([requireDoctor(locale, `/doctor/knowledge${global ? "?tab=global" : ""}`), getT(locale)]);
  if (!access) return <UnavailablePage locale={locale} />;
  const [documents, globals] = await Promise.all([
    doctorList<KnowledgeDocument[]>("/knowledge/documents"),
    doctorList<GlobalDocument[]>("/knowledge/global"),
  ]);
  const operator = isOperator(access.me.active_role);
  const number = new Intl.NumberFormat(locale);
  const base = `/${locale}/doctor/knowledge`;
  const indexing = documents ? needsRefresh(documents, new Date()) : false;
  // A API devolve até 200; sem a lista, nada de número (0 diria que não há documentos).
  const count = (list: readonly unknown[] | null) => (list === null ? "" : ` ${number.format(list.length)}${list.length >= 200 ? "+" : ""}`);

  return (
    <DoctorShell locale={locale} active={access.active} current="knowledge">
      {indexing && <AutoRefresh seconds={5} />}
      <PageHeading title={t("site.doctor.nav.knowledge")} description={t("site.doctor.knowledge.intro")}>
        {operator && <UploadDocument />}
      </PageHeading>
      <div className="grid gap-5">
        <KnowledgeSearch />
        <LinkSegments label={t("site.doctor.knowledge.tabs")} options={[
          { href: base, label: `${t("site.doctor.knowledge.mine")}${count(documents)}`, current: !global },
          { href: `${base}?tab=global`, label: `${t("site.doctor.knowledge.global")}${count(globals)}`, current: global },
        ]} />
        {(global ? globals : documents) === null && <Unavailable locale={locale} title={t("site.doctor.knowledge.unavailable")} retry={`/doctor/knowledge${global ? "?tab=global" : ""}`} />}
        {!global && documents?.length === 0 && <p className="text-sm text-muted-foreground">{t(operator ? "site.doctor.knowledge.emptyOperator" : "site.doctor.knowledge.empty")}</p>}
        {!global && documents && documents.length > 0 && (
          <ul aria-label={t("site.doctor.knowledge.mine")} className="grid gap-2">
            {documents.map((document) => {
              const state = documentState(document.status);
              return (
                <li key={document.id} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
                  <Badge variant="outline" mono className="shrink-0">{documentKind(document)}</Badge>
                  <span className="grid min-w-0 flex-1 gap-1">
                    <span className="text-sm break-words">{document.title}</span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={state.variant}>{t(state.key)}</Badge>
                      {document.status === "ready" && t("site.doctor.knowledge.chunks", { count: document.chunk_count })}
                      {/* O motivo vem do worker como está. */}
                      {document.status === "failed" && document.error && <span className="break-words">{document.error}</span>}
                    </span>
                  </span>
                  {operator && <DeleteDocument id={document.id} title={document.title} />}
                </li>
              );
            })}
          </ul>
        )}
        {global && globals?.length === 0 && <p className="text-sm text-muted-foreground">{t("site.doctor.knowledge.empty")}</p>}
        {global && globals && globals.length > 0 && (
          <ul aria-label={t("site.doctor.knowledge.global")} className="grid gap-2">
            {globals.map((document) => (
              <li key={document.id} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <Badge variant="secondary" className="shrink-0">{t("site.doctor.knowledge.globalBadge")}</Badge>
                <span className="grid min-w-0 gap-1">
                  <span className="text-sm break-words">{document.title}</span>
                  <span className="text-xs text-muted-foreground">{t("site.doctor.knowledge.curated")}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="rounded-md border border-border bg-secondary px-3 py-2 text-sm">{t("site.doctor.knowledge.isolation")}</p>
      </div>
    </DoctorShell>
  );
}
