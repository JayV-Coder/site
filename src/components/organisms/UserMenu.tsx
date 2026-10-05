"use client";

import Link from "next/link";
import { ChevronDownIcon, LayoutDashboardIcon, LogOutIcon, UserRoundIcon } from "lucide-react";
import { UserAvatar } from "@/components/atoms";
import { SubmitButton } from "@/components/molecules";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useHref, useT } from "@/modules/i18n";

/** A conta no canto do cabeçalho: a foto com o ponto verde de conectado e,
 * do `sm` para cima, o nome. Abre um menu com quem é, o painel, a conta e
 * sair. Substitui o "Conectado como e-mail" solto, que no celular sumia. */
export function UserMenu({ name, email, photo, signOut }: {
  name: string;
  email: string | null;
  photo: string | null;
  signOut: () => Promise<void>;
}) {
  const t = useT();
  const href = useHref();
  const item = "flex min-h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-foreground transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none [&_svg]:size-4 [&_svg]:text-muted-foreground";

  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("site.nav.accountMenu")}
        className="group flex h-9 items-center gap-2 rounded-md border border-transparent ps-1 pe-1.5 text-sm transition-colors hover:border-border hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[state=open]:border-border data-[state=open]:bg-secondary sm:pe-2"
      >
        <span className="relative">
          <UserAvatar name={name} src={photo} className="size-7 text-xs" />
          <span aria-hidden="true" className="absolute -end-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background bg-go" />
        </span>
        <span className="hidden max-w-36 truncate font-medium sm:inline">{name}</span>
        <ChevronDownIcon aria-hidden="true" className="hidden size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 sm:block" />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(18rem,calc(100vw-2rem))] p-1.5">
        <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
          <UserAvatar name={name} src={photo} className="size-10 text-base" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            {email && <p className="truncate text-xs text-muted-foreground" title={email}>{email}</p>}
            <p className="mt-1 flex items-center gap-1.5 text-caption text-success">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-go" />
              {t("site.nav.connected")}
            </p>
          </div>
        </div>
        <div className="grid gap-0.5 border-t border-border pt-1.5">
          <Link className={item} href={href("/dashboard")}><LayoutDashboardIcon />{t("site.nav.dashboard")}</Link>
          <Link className={item} href={href("/dashboard/account")}><UserRoundIcon />{t("site.account.title")}</Link>
        </div>
        <form action={signOut} className="mt-1.5 border-t border-border pt-1.5">
          <SubmitButton variant="ghost" className="h-9 w-full justify-start gap-2.5 px-2.5 font-normal text-destructive hover:bg-destructive/10 hover:text-destructive [&_svg]:text-destructive">
            <LogOutIcon />
            {t("auth.signOut")}
          </SubmitButton>
        </form>
      </PopoverContent>
    </Popover>
  );
}
