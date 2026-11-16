import type { ReactNode } from "react";
import Link from "next/link";
import { ActivityIcon, Building2Icon, CableIcon, FileUpIcon, PlugIcon, SirenIcon, TicketIcon, WorkflowIcon } from "lucide-react";
import { SitePage } from "@/components/organisms/SitePage";
import { cn } from "@/lib/utils";
import type { Organization } from "@/modules/doctor/api";
import { getT } from "@/modules/i18n/server";

export type DoctorSection = "overview" | "incidents" | "executions" | "integrations" | "connectors" | "import" | "tickets";

/** A moldura do Doctor: a Organização ativa em cima (o botão leva à troca), as seções e a
 * página. No celular as seções são uma faixa que rola de lado; a partir de `md`, uma coluna.
 * Cada bloco de telas que chega acrescenta a sua seção aqui. */
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
    { id: "tickets" as const, href: `${base}/tickets`, label: t("site.doctor.nav.tickets"), Icon: TicketIcon },
  ];

  return (
    <SitePage locale={locale}>
      <div className="shell grid gap-5 py-6 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs tracking-wider text-muted-foreground uppercase">{t("site.doctor.name")}</span>
          <Link href={`${base}/organizations`} aria-label={t("site.doctor.org.switchLabel", { name: active.name })}
            className="flex min-h-9 max-w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-secondary">
            <Building2Icon aria-hidden="true" className="size-4 flex-none text-muted-foreground" />
            <span className="truncate">{active.name}</span>
          </Link>
        </div>
        {sections.length > 1 && (
          <nav aria-label={t("site.doctor.nav.label")} className="-mx-4 flex gap-1 overflow-x-auto border-b border-border/70 px-4 pb-3 [scrollbar-width:none]">
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
        )}
        <div className="@container min-w-0">{children}</div>
      </div>
    </SitePage>
  );
}
