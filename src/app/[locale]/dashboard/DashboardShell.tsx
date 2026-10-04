import type { ReactNode } from "react";
import Link from "next/link";
import { Building2Icon, ShieldCheckIcon, UserRoundIcon, UsersIcon } from "lucide-react";
import { SitePage } from "@/components/organisms/SitePage";
import { cn } from "@/lib/utils";
import { getT } from "@/modules/i18n/server";
import type { Access } from "./access";

export type DashboardSection = "account" | "organizations" | "users" | "admin";

/** A moldura do painel: as seções à esquerda (em cima, no celular) e a
 * página ao lado. A conta é de todo mundo; Usuários e Administração só
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
      <div className="shell grid gap-8 py-10 md:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label={t("site.dashboard.label")} className="flex gap-1 overflow-x-auto md:sticky md:top-20 md:flex-col md:self-start">
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
        <div className="min-w-0">{children}</div>
      </div>
    </SitePage>
  );
}
