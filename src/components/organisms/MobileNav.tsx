"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, XIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useT } from "@/modules/i18n";

export interface NavLink { href: string; label: string }

/** Os atalhos da página abaixo do `lg`, onde a barra não cabe: um botão de
 * menu que abre a lista inteira. Fecha ao escolher um destino. */
export function MobileNav({ links, extra }: { links: NavLink[]; extra?: NavLink[] }) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const item = "flex min-h-10 items-center rounded-md px-3 text-sm transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t(open ? "site.nav.closeMenu" : "site.nav.openMenu")}
        className="grid size-9 place-items-center rounded-md border border-border text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[state=open]:bg-secondary lg:hidden"
      >
        {open ? <XIcon className="size-4" /> : <MenuIcon className="size-4" />}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(20rem,calc(100vw-2rem))] p-1.5">
        <nav aria-label={t("site.nav.label")} className="grid gap-0.5">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(item, pathname === link.href ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground")}>
              {link.label}
            </Link>
          ))}
        </nav>
        {extra && extra.length > 0 && (
          <div className="mt-1.5 grid gap-0.5 border-t border-border pt-1.5">
            {extra.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={cn(item, "text-foreground")}>{link.label}</Link>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
