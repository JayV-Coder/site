import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRightIcon, EyeOffIcon, FileClockIcon, FileLockIcon, HardDriveIcon, KeyRoundIcon, ListChecksIcon, ScanEyeIcon,
  ShieldCheckIcon, SlidersHorizontalIcon, TableIcon, ToggleLeftIcon, type LucideIcon,
} from "lucide-react";
import { Eyebrow } from "@/components/atoms";
import { PageHeading } from "@/components/molecules";
import { SitePage } from "@/components/organisms/SitePage";
import { Badge } from "@/components/ui/badge";
import type { Key } from "@/modules/i18n";
import { getT } from "@/modules/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/security">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.security.title")} · JayV`, description: t("site.security.description") };
}

/** Os controles que existem hoje, cada um com a página do manual que explica
 * como ligar ou conferir. */
const CONTROLS: { id: string; Icon: LucideIcon; docs: string }[] = [
  { id: "local", Icon: HardDriveIcon, docs: "category-privacy" },
  { id: "secrets", Icon: EyeOffIcon, docs: "secretRedaction" },
  { id: "sensitive", Icon: FileLockIcon, docs: "sensitiveFiles" },
  { id: "policies", Icon: SlidersHorizontalIcon, docs: "commandPermissions" },
  { id: "validation", Icon: ListChecksIcon, docs: "orgValidation" },
  { id: "access", Icon: ScanEyeIcon, docs: "memberAccess" },
  { id: "audit", Icon: FileClockIcon, docs: "auditLog" },
  { id: "mfa", Icon: KeyRoundIcon, docs: "twoFactor" },
  { id: "rls", Icon: TableIcon, docs: "organizations" },
  { id: "telemetry", Icon: ToggleLeftIcon, docs: "featureTelemetry" },
];

/** O plano de conformidade, na ordem: o primeiro passo do SOC 2 é saber o que
 * existe (inventário) e escrever as regras (políticas). */
const PLAN: { id: string; state: "progress" | "planned" }[] = [
  { id: "inventory", state: "progress" },
  { id: "policies", state: "progress" },
  { id: "evidence", state: "planned" },
  { id: "type1", state: "planned" },
  { id: "type2", state: "planned" },
];

const PROCESSORS = ["supabase", "stripe", "github", "jev", "agents"] as const;

/** A página pública de segurança: o que o JayV faz hoje para proteger código,
 * segredos e equipes, quem processa os dados e o plano até o SOC 2. Diz com
 * clareza o que ainda não existe. */
export default async function SecurityPage({ params }: PageProps<"/[locale]/security">) {
  const { locale } = await params;
  const t = await getT(locale);
  const docs = (anchor: string) => `/${locale}/docs#${anchor}`;

  return (
    <SitePage locale={locale}>
      <div className="shell grid gap-12 py-8 md:py-12">
        <PageHeading eyebrow={t("site.security.eyebrow")} title={t("site.security.title")} description={t("site.security.description")} />

        <section aria-labelledby="security-controls" className="grid gap-4">
          <h2 id="security-controls" className="text-h3 font-semibold">{t("site.security.controls")}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {CONTROLS.map(({ id, Icon, docs: anchor }) => (
              <li key={id} className="flex gap-3 rounded-lg border border-border bg-card p-4">
                <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-md border border-border bg-background"><Icon className="size-4" /></span>
                <div className="grid min-w-0 content-start gap-1">
                  <h3 className="text-sm font-semibold">{t(`site.security.control.${id}.title` as Key)}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t(`site.security.control.${id}.detail` as Key)}</p>
                  <Link href={docs(anchor)} className="inline-flex w-fit items-center gap-1 text-small font-semibold underline-offset-4 hover:underline">
                    {t("site.security.docs")}<ChevronRightIcon aria-hidden="true" className="size-3.5 rtl:rotate-180" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="security-processors" className="grid gap-4">
          <div>
            <h2 id="security-processors" className="text-h3 font-semibold">{t("site.security.processors")}</h2>
            <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{t("site.security.processorsHint")}</p>
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            {PROCESSORS.map((id) => (
              <div key={id} className="rounded-md border border-border/60 px-3.5 py-2.5">
                <dt className="text-sm font-medium">{t(`site.security.processor.${id}.name` as Key)}</dt>
                <dd className="text-xs leading-relaxed text-muted-foreground">{t(`site.security.processor.${id}.use` as Key)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="security-plan" className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:p-6">
          <div>
            <Eyebrow>{t("site.security.planKicker")}</Eyebrow>
            <h2 id="security-plan" className="flex gap-[1ch] text-h3 font-semibold"><ShieldCheckIcon aria-hidden="true" className="mt-1 size-5 text-go" />{t("site.security.plan")}</h2>
            <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">{t("site.security.planHint")}</p>
          </div>
          <ol className="grid gap-2">
            {PLAN.map((step, index) => (
              <li key={step.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
                <span className="font-mono text-small text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                <div className="grid gap-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {t(`site.security.step.${step.id}.title` as Key)}
                    <Badge variant={step.state === "progress" ? "warning" : "outline"}>{t(`site.security.state.${step.state}` as Key)}</Badge>
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t(`site.security.step.${step.id}.detail` as Key)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <p className="max-w-[70ch] text-xs leading-relaxed text-muted-foreground">{t("site.security.report")}</p>
      </div>
    </SitePage>
  );
}
