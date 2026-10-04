import type { ReactNode } from "react";
import Link from "next/link";
import { Building2Icon, ShieldCheckIcon, UserRoundIcon, UsersIcon } from "lucide-react";
import { SitePage } from "@/components/organisms/SitePage";
import { cn } from "@/lib/utils";
import { getT } from "@/modules/i18n/server";
import type { Access } from "./access";
import { CurrentInView } from "./CurrentInView";

export type DashboardSection = "account" | "organizations" | "users" | "admin";

/** A moldura do painel: as seções à esquerda (no celular, uma faixa que
 * rola de lado, de ponta a ponta) e a página ao lado. A conta é de todo mundo; Usuários e Administração só
 * aparecem para o admin do sistema. */
export async function DashboardShell({ locale, access, current, children }: {
  locale: string; access: Access; current: DashboardSection; children: ReactNode;
}) {
  const t = await getT(locale);
  const base = `/${locale}/dashboard`;
  const sections = [
    { id: "account" as const, href: `${base}/account`, label: t("site.account.title"), Icon: UserRoundIcon, shown: true },
    { id: "organizations" as const, href: `${base}/organizations`, label: t("nav.organizations"), Icon: Building2Icon, shown: true },
    { id: "users" as const, href: `${base}/users`, label: t("site.users.title"), Icon: UsersIcon, shown: access.admin },
    { id: "admin" as const, href: `${base}/admin`, label: t("nav.admin"), Icon: ShieldCheckIcon, shown: access.admin },
  ].filter((section) => section.shown);

  return (
    <SitePage locale={locale}>
      <div className="shell grid gap-6 py-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8 md:py-10">
        <nav id="dashboard-sections" aria-label={t("site.dashboard.label")} className="relative -mx-4 flex gap-1 overflow-x-auto border-b border-border/70 px-4 pb-3 [scrollbar-width:none] md:sticky md:top-20 md:mx-0 md:flex-col md:self-start md:border-0 md:px-0 md:pb-0">
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
        <CurrentInView nav="dashboard-sections" />
        <div className="@container min-w-0">{children}</div>
      </div>
    </SitePage>
  );
}
