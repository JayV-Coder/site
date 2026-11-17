"use client";

import { useMemo, useState } from "react";
import { ConfirmAction, FormField, OptionSelect } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Schemas } from "@/modules/doctor/api";
import { initials, matchesSearch, roleKey } from "@/modules/doctor/labels";
import { daysLeft, inviteRoles, isLocked } from "@/modules/doctor/members";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT, type Key } from "@/modules/i18n";
import { changeRole, invite, removeMember, resendInvitation, revokeInvitation } from "./actions";

type Member = Schemas["Member"];
type Invitation = Schemas["Invitation"];

function useRoleName() {
  const t = useT();
  return (role: string) => { const key = roleKey(role); return key ? t(key) : role; };
}

function MemberRow({ member, viewerRole }: { member: Member; viewerRole: string }) {
  const t = useT();
  const say = useSay();
  const roleName = useRoleName();
  const change = useKeyedAction();
  const remove = useKeyedAction();
  const name = member.display_name ?? member.email;
  const error = change.error ?? remove.error;
  return (
    <li className="grid gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-9 flex-none place-items-center rounded-full bg-secondary text-xs font-medium">{initials(name)}</span>
        <span className="grid min-w-0">
          <strong className="font-medium break-words">{name}</strong>
          <span className="text-xs break-all text-muted-foreground">{member.email}{member.mfa_enabled ? ` · ${t("site.doctor.members.mfaOn")}` : ""}</span>
        </span>
      </div>
      {isLocked(member.role, viewerRole) ? <div><Badge variant="secondary">{roleName(member.role)}</Badge></div> : (
        <div className="flex flex-wrap items-end gap-2">
          <FormField label={t("site.doctor.members.roleOf", { name })} className="min-w-40 flex-1">
            <OptionSelect value={member.role} disabled={change.busy} label={t("site.doctor.members.roleOf", { name })}
              onChange={(role) => change.run((key) => changeRole(member.id, role, key))}
              options={inviteRoles(viewerRole).map((value) => ({ value, label: roleName(value) }))} />
          </FormField>
          <ConfirmAction title={t("site.doctor.members.removeTitle", { name })} description={t("site.doctor.members.removeBody")} confirm={t("site.doctor.members.remove")}
            onConfirm={() => remove.run((key) => removeMember(member.id, key))}>
            <Button variant="ghost" size="sm" loading={remove.busy} aria-label={t("site.doctor.members.removeTitle", { name })}>{t("site.doctor.members.remove")}</Button>
          </ConfirmAction>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
    </li>
  );
}

function InvitationRow({ invitation }: { invitation: Invitation }) {
  const t = useT();
  const say = useSay();
  const roleName = useRoleName();
  const resend = useKeyedAction();
  const revoke = useKeyedAction();
  const [resent, setResent] = useState(false);
  const left = daysLeft(invitation.expires_at);
  const error = resend.error ?? revoke.error;
  return (
    <li className="grid gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <span className="grid min-w-0">
        <strong className="font-medium break-all">{invitation.email}</strong>
        <span className="text-xs text-muted-foreground">{roleName(invitation.role)} · {left > 0 ? t("site.doctor.members.expiresIn", { count: left }) : t("site.doctor.members.expired")}</span>
      </span>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" loading={resend.busy} onClick={() => resend.run((key) => resendInvitation(invitation.id, key), () => setResent(true))}>{t("site.doctor.members.resend")}</Button>
        <Button variant="ghost" size="sm" loading={revoke.busy} onClick={() => revoke.run((key) => revokeInvitation(invitation.id, key))}>{t("site.doctor.members.revoke")}</Button>
      </div>
      {resent && !error && <p role="status" className="text-sm text-muted-foreground">{t("site.doctor.members.resent", { email: invitation.email })}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
    </li>
  );
}

/** Membros, Convites pendentes e o formulário de novo convite. Só Owner e Admin com MFA chegam
 * aqui (a API recusa os outros); só o Owner convida ou promove outro Owner. */
export function MembersPanel({ members, invitations, viewerRole }: { members: Member[]; invitations: Invitation[]; viewerRole: string }) {
  const t = useT();
  const say = useSay();
  const roleName = useRoleName();
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("analyst");
  const [sent, setSent] = useState<string | null>(null);
  const send = useKeyedAction();
  const visible = useMemo(() => members.filter((member) => matchesSearch(`${member.display_name ?? ""} ${member.email}`, query)), [members, query]);

  return (
    <div className="grid gap-5">
      <FormField label={t("site.doctor.members.search")} htmlFor="doctor-member-search">
        <Input id="doctor-member-search" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
      </FormField>
      <ul className="grid gap-3 @3xl:grid-cols-2">{visible.map((member) => <MemberRow key={member.id} member={member} viewerRole={viewerRole} />)}</ul>
      {invitations.length > 0 && (
        <section aria-labelledby="doctor-pending-invitations" className="grid gap-3">
          <h2 id="doctor-pending-invitations" className="text-sm font-medium text-muted-foreground">{t("site.doctor.members.pending")}</h2>
          <ul className="grid gap-3 @3xl:grid-cols-2">{invitations.map((invitation) => <InvitationRow key={invitation.id} invitation={invitation} />)}</ul>
        </section>
      )}
      <form className="grid max-w-xl gap-3 rounded-lg border border-border bg-card px-4 py-4"
        onSubmit={(event) => { event.preventDefault(); send.run((key) => invite(email, role, key), () => { setSent(email.trim()); setEmail(""); }); }}>
        <h2 className="font-medium">{t("site.doctor.members.newInvite")}</h2>
        <FormField label={t("site.doctor.members.email")} htmlFor="doctor-invite-email">
          <Input id="doctor-invite-email" type="email" required value={email} onChange={(event) => { setEmail(event.currentTarget.value); setSent(null); if (send.error) send.reset(); }} />
        </FormField>
        <FormField label={t("site.doctor.members.inviteRole")} htmlFor="doctor-invite-role">
          <OptionSelect id="doctor-invite-role" value={role} onChange={setRole}
            options={inviteRoles(viewerRole).map((value) => ({ value, label: `${roleName(value)} — ${t(`site.doctor.members.roleDesc.${value}` as Key)}` }))} />
        </FormField>
        {send.error && <p role="alert" className="text-sm text-destructive">{say(send.error)}</p>}
        {sent && !send.error && <p role="status" className="text-sm text-muted-foreground">{t("site.doctor.members.sent", { email: sent })}</p>}
        <div><Button type="submit" loading={send.busy}>{t("site.doctor.members.send")}</Button></div>
      </form>
    </div>
  );
}
