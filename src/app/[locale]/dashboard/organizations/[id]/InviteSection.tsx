"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EmptyText, UserAvatar } from "@/components/atoms";
import { OptionSelect, SettingsSection } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFeedback } from "@/modules/feedback";
import { useLocale, useT, type Key } from "@/modules/i18n";
import { canManage, INVITE_ROLES, type Role } from "@/modules/organizations/rules";
import { findUsers, inviteMember, revokeInvite, type FoundUser } from "../actions";
import type { OrganizationDetail } from "../data";

/** O convite de membros, trazido do app: por `@usuário` (com busca enquanto
 * se digita) ou por e-mail, e os convites pendentes. Só para quem gere. */
export function InviteSection({ detail }: { detail: OrganizationDetail }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { report, notify } = useFeedback();
  const [busy, startBusy] = useTransition();
  const [revoking, setRevoking] = useState<string | null>(null);
  const day = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));

  if (!canManage(detail.organization.role)) return <EmptyText>{t("site.org.invites.readOnly")}</EmptyText>;

  const revoke = (id: string) => startBusy(async () => {
    setRevoking(id);
    const result = await revokeInvite(id);
    setRevoking(null);
    if (!result.ok) report(result.error);
    else notify(t("site.org.revoked"));
    router.refresh();
  });

  return (
    <SettingsSection title={t("org.invite.title")} description={t("org.invite.description")}>
      <InviteForm orgId={detail.organization.id} />
      {detail.invites.length === 0
        ? <EmptyText>{t("site.org.invites.none")}</EmptyText>
        : (
          <ul className="grid gap-2">
            {detail.invites.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-dashed border-border/70 px-3 py-2">
                <span className="min-w-0 basis-full truncate text-sm @lg:basis-auto @lg:flex-1">{invite.username ? `@${invite.username}` : invite.email}</span>
                <Badge variant="outline">{t(`org.role.${invite.role}` as Key)}</Badge>
                <span className="text-xs text-muted-foreground">{t("org.invite.expires", { date: day(invite.expiresAt) })}</span>
                <Button variant="ghost" size="sm" className="ms-auto" loading={revoking === invite.id} disabled={busy} onClick={() => revoke(invite.id)}>{t("org.invite.revoke")}</Button>
              </li>
            ))}
          </ul>
        )}
    </SettingsSection>
  );
}

/** O e-mail não é buscado: dizer quem tem conta seria vazar a lista. */
function InviteForm({ orgId }: { orgId: string }) {
  const t = useT();
  const router = useRouter();
  const { report, notify } = useFeedback();
  const [target, setTarget] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [found, setFound] = useState<FoundUser[]>([]);
  const [busy, startBusy] = useTransition();
  const isEmail = /^[^@\s]+@[^@\s]+$/.test(target.trim());

  useEffect(() => {
    const query = target.trim().replace(/^@/, "");
    if (isEmail || query.length < 2) { setFound([]); return; }
    let live = true;
    const timer = setTimeout(() => {
      findUsers(query).then((users) => { if (live) setFound(users); }).catch(() => { if (live) setFound([]); });
    }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [target, isEmail]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!target.trim()) return;
    startBusy(async () => {
      const result = await inviteMember(orgId, target, role);
      if (!result.ok) {
        report(result.error);
        return;
      }
      notify(t("org.invite.sent", { target: target.trim() }));
      setTarget("");
      setFound([]);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-2">
      <div className="flex flex-col gap-2 @lg:flex-row @lg:items-start">
        <div className="relative min-w-0 flex-1">
          <Input aria-label={t("org.invite.target")} placeholder={t("org.invite.placeholder")} autoCapitalize="none" spellCheck={false}
            value={target} onChange={(event) => setTarget(event.target.value)} />
          {found.length > 0 && (
            <ul role="listbox" className="absolute inset-x-0 top-full z-10 mt-1 grid overflow-hidden rounded-md border border-border bg-popover shadow-lg">
              {found.map((user) => (
                <li key={user.userId} role="option" aria-selected={false}>
                  <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-secondary"
                    onClick={() => { setTarget(`@${user.username}`); setFound([]); }}>
                    <UserAvatar name={user.displayName} src={user.avatarUrl} className="size-6 text-caption" />
                    <span className="truncate">{user.displayName}</span>
                    <span className="font-mono text-xs text-muted-foreground">@{user.username}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="@lg:w-40">
          <OptionSelect label={t("org.invite.role")} value={role} onChange={setRole}
            options={INVITE_ROLES.map((value) => ({ value, label: t(`org.role.${value}` as Key) }))} />
        </div>
        <Button type="submit" loading={busy} disabled={!target.trim()}>{t("org.invite.send")}</Button>
      </div>
      <p className="text-xs text-muted-foreground">{isEmail ? t("org.invite.emailNote") : t("org.invite.hint")}</p>
    </form>
  );
}
