import type { Metadata } from "next";
import { PageHeading } from "@/components/molecules";
import { getT } from "@/modules/i18n/server";
import { environmentOk } from "@/modules/mods/rules";
import { modCatalog } from "@/modules/mods/server";
import { requireAccess } from "../access";
import { DashboardShell } from "../DashboardShell";
import { loadOrganizations } from "../organizations/data";
import { effectiveState } from "@/modules/mods/state";
import { loadMods, loadModState } from "./data";
import { ModsBoard } from "./ModsBoard";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/mods">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.mods.title")} · JayV`, robots: { index: false } };
}

/** Os mods: o catálogo do repositório `jayv-coder-mods` (lido pela função
 * `mods` do Supabase) — instalar, ligar, desligar e desinstalar em cada
 * ambiente, como a aba Mods do app — e os mods que a pessoa cria: criar, editar
 * e excluir. O app abre
 * esta página com o ambiente aberto nele (`?environment=`) e, no "Criar mod",
 * com o formulário aberto (`?create=1`). */
export default async function ModsPage({ params, searchParams }: PageProps<"/[locale]/dashboard/mods">) {
  const { locale } = await params;
  const query = await searchParams;
  const access = await requireAccess(locale, "/dashboard/mods");
  const t = await getT(locale);
  const organizations = await loadOrganizations().catch(() => []);
  const asked = typeof query.environment === "string" ? query.environment : "personal";
  // Um ambiente que não é de quem entrou vira o pessoal.
  const environment = environmentOk(asked) && (asked === "personal" || organizations.some((organization) => organization.id === asked)) ? asked : "personal";
  const [catalog, mods, saved] = await Promise.all([modCatalog(), loadMods(environment), loadModState(environment)]);
  // O estado como o app o vê: o gravado mais os mods de fábrica que o
  // ambiente ainda não tem (o app os instala no login).
  const state = saved ? effectiveState(saved.stored, catalog, saved.legacy) : null;

  return (
    <DashboardShell locale={locale} access={access} current="mods">
      <PageHeading eyebrow={t("site.dashboard.title")} title={t("site.mods.title")} description={t("site.mods.intro")} />
      <ModsBoard
        environment={environment}
        environments={[{ id: "personal", name: t("site.mods.environment.personal") }, ...organizations.map((organization) => ({ id: organization.id, name: organization.name }))]}
        catalog={catalog}
        state={state}
        mods={mods}
        canCreate={access.mods || access.admin}
        startCreating={query.create === "1"}
      />
    </DashboardShell>
  );
}
