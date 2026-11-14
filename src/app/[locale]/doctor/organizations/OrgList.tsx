"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Organization } from "@/modules/doctor/api";
import { initials, matchesSearch, roleKey } from "@/modules/doctor/labels";
import { useHref, useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { switchOrganization } from "./actions";

/** As Organizações de quem entrou, com busca. Escolher uma troca a ativa, renova a sessão e
 * recarrega o Doctor inteiro. */
export function OrgList({ organizations, activeId }: { organizations: Organization[]; activeId: string | null }) {
  const t = useT();
  const say = useSay();
  const href = useHref();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<Text | null>(null);
  const [busy, startBusy] = useTransition();
  const visible = organizations.filter(({ name }) => matchesSearch(name, query));

  const choose = (id: string) => {
    startBusy(async () => {
      const failed = await switchOrganization(id).catch((): Text => ({ key: "site.doctor.error.offline" }));
      setError(failed);
      if (failed === null) window.location.assign(href("/doctor"));
    });
  };

  return (
    <div className="grid gap-3">
      {organizations.length > 5 && (
        <div className="grid gap-1.5">
          <Label htmlFor="doctor-org-search" className="text-xs font-normal text-muted-foreground">{t("site.doctor.org.search")}</Label>
          <Input id="doctor-org-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      )}
      <ul className="grid gap-2">
        {visible.map((organization) => {
          const current = organization.id === activeId;
          const role = roleKey(organization.role);
          return (
            <li key={organization.id}>
              <button type="button" disabled={busy} aria-current={current || undefined}
                onClick={() => { if (!current) choose(organization.id); }}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-start transition-colors outline-none hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                  current && "border-foreground/40",
                )}>
                <span aria-hidden="true" className="grid size-9 flex-none place-items-center rounded-md bg-secondary text-xs font-semibold">{initials(organization.name)}</span>
                <span className="grid min-w-0 flex-1">
                  <strong className="truncate text-sm font-medium">{organization.name}</strong>
                  <span className="text-xs text-muted-foreground">{role ? t(role) : organization.role}</span>
                </span>
                {current && <Badge variant="success">{t("site.doctor.org.active")}</Badge>}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
      <Link href={href("/doctor/organizations/new")} className="justify-self-start text-sm underline underline-offset-4 hover:text-foreground">
        {t("site.doctor.org.new")}
      </Link>
    </div>
  );
}
