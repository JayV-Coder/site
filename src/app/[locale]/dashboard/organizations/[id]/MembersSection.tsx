"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/atoms";
import { ConfirmAction, OptionSelect, SettingsSection } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/modules/feedback";
import { useT, type Key } from "@/modules/i18n";
import { canChangeRoles, canRemove, type Role } from "@/modules/organizations/rules";
import { removeMember, setMemberRole } from "../actions";
import type { OrganizationDetail } from "../data";

const ROLES: Role[] = ["owner", "maintainer", "member"];

/** Quem já está na organização, owner incluso, com papel e remoção para quem
 * gere: a mesma lista da aba Membros do app. Os convites pendentes ficam na
 * seção de convites, logo abaixo. */
export function MembersSection({ detail }: { detail: OrganizationDetail }) {
  const t = useT();
  const router = useRouter();
  const { report } = useFeedback();
  const [busy, startBusy] = useTransition();
  const [acting, setActing] = useState<string | null>(null);
  const mine = detail.organization.role;
  const roleName = (value: Role) => t(`org.role.${value}` as Key);

  const run = (member: string, action: () => ReturnType<typeof removeMember>) => startBusy(async () => {
    setActing(member);
    const result = await action();
    setActing(null);
    if (!result.ok) report(result.error);
    router.refresh();
  });

  return (
    <SettingsSection title={t("org.members.title")} description={t("org.count.members", { count: detail.members.length })}>
      <ul className="grid gap-2">
        {detail.members.map((member) => (
          <li key={member.userId} className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 px-3 py-2.5">
            <UserAvatar name={member.displayName} src={member.avatarUrl} className="size-8 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member.displayName}{member.self && <span className="ms-2 text-xs text-muted-foreground">{t("org.members.you")}</span>}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">@{member.username}</p>
            </div>
            {canChangeRoles(mine) && !member.self ? (
              <div className="w-40">
                <OptionSelect label={t("org.members.role", { user: member.username })} value={member.role} disabled={busy}
                  options={ROLES.map((value) => ({ value, label: roleName(value) }))}
                  onChange={(next) => run(member.userId, () => setMemberRole(detail.organization.id, member.userId, next))} />
              </div>
            ) : <Badge variant="outline">{roleName(member.role)}</Badge>}
            {canRemove(mine, member.role) && !member.self && (
              <ConfirmAction title={t("org.members.remove.title")} description={t("org.members.remove.description", { user: member.username })}
                confirm={t("org.members.remove")} onConfirm={() => run(member.userId, () => removeMember(detail.organization.id, member.userId))}>
                <Button variant="ghost" size="sm" loading={acting === member.userId} disabled={busy} className="text-muted-foreground hover:text-destructive">{t("org.members.remove")}</Button>
              </ConfirmAction>
            )}
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
