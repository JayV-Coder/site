import type { ReactNode } from "react";
import Link from "next/link";
import { ActivityIcon, BellIcon, Building2Icon, CableIcon, FileUpIcon, GaugeIcon, LibraryIcon, LockIcon, UsersIcon, PlugIcon, ScrollTextIcon, ShieldCheckIcon, SirenIcon, TicketIcon, WebhookIcon, WorkflowIcon } from "lucide-react";
import { CurrentInView } from "@/components/molecules/CurrentInView";
import { SitePage } from "@/components/organisms/SitePage";
import { cn } from "@/lib/utils";
import type { Organization } from "@/modules/doctor/api";
import { getT } from "@/modules/i18n/server";

export type DoctorSection = "overview" | "incidents" | "executions" | "integrations" | "connectors" | "import" | "alerts" | "webhooks" | "tickets" | "knowledge" | "usage" | "subprocessors" | "members" | "privacy" | "audit";

/** A moldura do Doctor, como a do painel do site: a Organização ativa em cima (o botão leva à
 * troca), as seções à esquerda e a página ao lado. No celular as seções são uma faixa que rola
 * de lado (a aberta entra na vista); a partir de `lg`, uma coluna fixa ao rolar. Em `lg`, e não em
 * `md` como no painel, porque os formulários do Doctor mudam de layout pela largura da tela e
 * ficariam apertados ao lado da coluna entre 768 e 1024 px. Cada bloco de
 * telas que chega acrescenta a sua seção aqui. */
export async function DoctorShell({ locale, active, current, children }: {
  locale: string; active: Organization; current: DoctorSection; children: ReactNode;
}) {
  const t = await getT(locale);
  const base = `/${locale}/doctor`;
  const sections = [
    { id: "overview" as const, href: base, label: t("site.doctor.nav.overview"), Icon: ActivityIcon },
    { id: "incidents" as const, href: `${base}/incidents`, label: t("site.doctor.nav.incidents"), Icon: SirenIcon },
    { id: "executions" as const, href: `${base}/executions`, label: t("site.doctor.nav.executions"), Icon: WorkflowIcon },
    { id: "integrations" as const, href: `${base}/integrations`, label: t("site.doctor.nav.integrations"), Icon: CableIcon },
    { id: "connectors" as const, href: `${base}/connectors`, label: t("site.doctor.nav.connectors"), Icon: PlugIcon },
    { id: "import" as const, href: `${base}/import`, label: t("site.doctor.nav.import"), Icon: FileUpIcon },
    { id: "alerts" as const, href: `${base}/alerts`, label: t("site.doctor.nav.alerts"), Icon: BellIcon },
    { id: "webhooks" as const, href: `${base}/webhooks`, label: t("site.doctor.nav.webhooks"), Icon: WebhookIcon },
    { id: "tickets" as const, href: `${base}/tickets`, label: t("site.doctor.nav.tickets"), Icon: TicketIcon },
    { id: "knowledge" as const, href: `${base}/knowledge`, label: t("site.doctor.nav.knowledge"), Icon: LibraryIcon },
    { id: "usage" as const, href: `${base}/usage`, label: t("site.doctor.nav.usage"), Icon: GaugeIcon },
    { id: "subprocessors" as const, href: `${base}/subprocessors`, label: t("site.doctor.nav.subprocessors"), Icon: ShieldCheckIcon },
    { id: "members" as const, href: `${base}/members`, label: t("site.doctor.nav.members"), Icon: UsersIcon },
    { id: "privacy" as const, href: `${base}/privacy`, label: t("site.doctor.nav.privacy"), Icon: LockIcon },
    { id: "audit" as const, href: `${base}/audit`, label: t("site.doctor.nav.audit"), Icon: ScrollTextIcon },
  ];

  return (
    <SitePage locale={locale}>
      <div className="shell grid gap-5 py-6 md:py-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-8">
        <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
          <span className="text-xs tracking-wider text-muted-foreground uppercase">{t("site.doctor.name")}</span>
          <Link href={`${base}/organizations`} aria-label={t("site.doctor.org.switchLabel", { name: active.name })}
            className="flex min-h-9 max-w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-secondary">
            <Building2Icon aria-hidden="true" className="size-4 flex-none text-muted-foreground" />
            <span className="truncate">{active.name}</span>
          </Link>
        </div>
        <nav id="doctor-sections" aria-label={t("site.doctor.nav.label")}
          className="relative -mx-4 flex gap-1 overflow-x-auto border-b border-border/70 px-4 pb-3 [scrollbar-width:none] lg:sticky lg:top-20 lg:-mx-1 lg:max-h-[calc(100dvh-6rem)] lg:flex-col lg:self-start lg:overflow-y-auto lg:border-0 lg:p-1">
          {sections.map(({ id, href, label, Icon }) => (
            <Link key={id} href={href} aria-current={id === current ? "page" : undefined}
              className={cn(
                "flex flex-none items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                id === current ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}>
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <CurrentInView nav="doctor-sections" />
        <div className="@container min-w-0">{children}</div>
      </div>
    </SitePage>
  );
}
