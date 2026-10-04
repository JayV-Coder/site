"use server";

import { revalidatePath } from "next/cache";
import type { Text } from "@/modules/i18n/types";
import { policyOk, policyPayload, type LlmPolicy } from "@/modules/organizations/policy";
import { INVITE_ROLES, orgFailure, slugOk, type Role } from "@/modules/organizations/rules";
import { userSupabase } from "@/modules/supabase/server";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: Text | string };

export interface FoundUser { userId: string; username: string; displayName: string; avatarUrl: string | null }

/** As gravações de organização, pelas mesmas RPCs do app. O token é o de
 * quem entrou: o banco confere o papel dele em cada uma. */
async function call<T>(name: string, args: Record<string, unknown>): Promise<ActionResult<T>> {
  const supabase = await userSupabase();
  if (!supabase) return { ok: false, error: { key: "org.forbidden" } };
  const { data, error } = await supabase.rpc(name, args);
  if (error) return { ok: false, error: orgFailure(error) };
  revalidatePath("/[locale]/dashboard/organizations", "layout");
  return { ok: true, data: data as T };
}

/** Quem cria vira owner; devolve o id para abrir a organização nova. */
export async function createOrganization(name: string, slug: string) {
  if (!name.trim() || !slugOk(slug)) return { ok: false, error: { key: "org.forbidden" } } as const;
  return call<string>("create_organization", { name: name.trim(), slug });
}

export async function inviteMember(org: string, target: string, role: Role) {
  if (!target.trim() || !(INVITE_ROLES as Role[]).includes(role)) return { ok: false, error: { key: "org.forbidden" } } as const;
  return call<string>("invite_member", { org, target: target.trim(), role });
}

export async function revokeInvite(invite: string) {
  return call<null>("revoke_invite", { invite });
}

export async function savePolicy(org: string, repository: string | null, policy: LlmPolicy) {
  if (!policyOk(policy)) return { ok: false, error: { key: "policy.invalid" } } as const;
  return call<null>("set_llm_policy", { org, repository, policy: policyPayload(policy) });
}

export async function clearPolicy(org: string, repository: string | null) {
  return call<null>("clear_llm_policy", { org, repository });
}

/** Renomear é de owner e maintainer; sair, de qualquer membro (o último
 * owner não sai); excluir, só do owner. O banco confere cada um. */
export async function renameOrganization(org: string, name: string) {
  if (!name.trim()) return { ok: false, error: { key: "org.forbidden" } } as const;
  return call<null>("rename_organization", { org, name: name.trim() });
}

export async function leaveOrganization(org: string) {
  return call<null>("leave_organization", { org });
}

export async function deleteOrganization(org: string) {
  return call<null>("delete_organization", { org });
}

/** A busca do convite por `@usuário`. O e-mail nunca é buscado: dizer quem
 * tem conta seria vazar a lista. */
export async function findUsers(query: string): Promise<FoundUser[]> {
  const supabase = await userSupabase();
  if (!supabase || query.trim().length < 2) return [];
  const { data, error } = await supabase.rpc("find_users", { query: query.trim() });
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    userId: row.user_id as string, username: row.username as string, displayName: row.display_name as string, avatarUrl: (row.avatar_url as string) ?? null,
  }));
}
