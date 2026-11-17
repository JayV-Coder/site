"use server";

import { unstable_update } from "@/auth";
import { sendToDoctor } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

const PAGE = "/[locale]/doctor/members";
const KNOWN = {
  already_invited: "site.doctor.members.error.alreadyInvited",
  already_member: "site.doctor.members.error.alreadyMember",
  last_owner: "site.doctor.members.error.lastOwner",
  mail_unavailable: "site.doctor.members.error.mailUnavailable",
};
const id = (value: string) => encodeURIComponent(value);
const write = (path: string, init: RequestInit, key: string, invalid?: string) =>
  sendToDoctor(path, init, { revalidate: PAGE, key, known: KNOWN, ...(invalid && { invalid }) });

export async function invite(email: string, role: string, key: string): Promise<Text | null> {
  return write("/invitations", { method: "POST", body: JSON.stringify({ email: email.trim(), role }) }, key, "site.doctor.members.error.invalidInvite");
}
export async function resendInvitation(invitation: string, key: string): Promise<Text | null> {
  return write(`/invitations/${id(invitation)}/resend`, { method: "POST" }, key);
}
export async function revokeInvitation(invitation: string, key: string): Promise<Text | null> {
  return write(`/invitations/${id(invitation)}`, { method: "DELETE" }, key);
}
export async function changeRole(member: string, role: string, key: string): Promise<Text | null> {
  return write(`/memberships/${id(member)}`, { method: "PATCH", body: JSON.stringify({ role }) }, key);
}
export async function removeMember(member: string, key: string): Promise<Text | null> {
  return write(`/memberships/${id(member)}`, { method: "DELETE" }, key);
}

/** O Papel vai nas claims do token, que só mudam na renovação: quem acabou de ser promovido
 * não precisa esperar a hora do token. */
export async function renewAccess(): Promise<Text | null> {
  const session = await unstable_update({ refresh: true } as Parameters<typeof unstable_update>[0]);
  return session?.accessToken ? null : { key: "site.doctor.org.renewFailed" };
}
