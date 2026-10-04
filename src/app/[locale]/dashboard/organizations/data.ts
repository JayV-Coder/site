import "server-only";
import { auth } from "@/auth";
import { storedPolicy, type StoredPolicy } from "@/modules/organizations/policy";
import { canManage, isRole, type Role } from "@/modules/organizations/rules";
import { userSupabase } from "@/modules/supabase/server";

export interface Organization { id: string; name: string; slug: string; role: Role; members: number; repositories: number }
export interface PendingInvite { id: string; username: string | null; email: string | null; role: Role; expiresAt: string }
export interface Repository { id: string; repoKey: string }

export interface OrganizationDetail {
  organization: Organization;
  invites: PendingInvite[];
  repositories: Repository[];
  /** A política da organização e as dos repositórios dela. */
  policies: StoredPolicy[];
}

type Row = Record<string, unknown>;

const tally = (rows: { org_id: string }[] | null) => {
  const counts: Record<string, number> = {};
  for (const row of rows ?? []) counts[row.org_id] = (counts[row.org_id] ?? 0) + 1;
  return counts;
};

/** As organizações de quem entrou, com o papel dele e as contagens — a mesma
 * leitura do `loadOrganizations` do app. O RLS só devolve as dele. */
export async function loadOrganizations(): Promise<Organization[]> {
  const [supabase, session] = await Promise.all([userSupabase(), auth()]);
  if (!supabase || !session?.user.id) return [];
  const [mine, members, repositories] = await Promise.all([
    supabase.from("organization_members").select("role, organizations(id, name, slug)").eq("user_id", session.user.id),
    supabase.from("organization_members").select("org_id"),
    supabase.from("organization_repositories").select("org_id"),
  ]);
  for (const result of [mine, members, repositories]) if (result.error) throw new Error(result.error.message);
  const memberCount = tally(members.data);
  const repositoryCount = tally(repositories.data);
  return (mine.data ?? []).flatMap((row) => {
    const org = row.organizations as unknown as { id: string; name: string; slug: string } | null;
    return org && isRole(row.role) ? [{ ...org, role: row.role, members: memberCount[org.id] ?? 0, repositories: repositoryCount[org.id] ?? 0 }] : [];
  }).sort((a, b) => a.name.localeCompare(b.name));
}

/** Uma organização de quem entrou: os convites pendentes (só para quem
 * gere), os repositórios (para escolher o escopo da política) e as políticas.
 * Nulo quando ele não está nela. */
export async function loadOrganization(id: string): Promise<OrganizationDetail | null> {
  const organization = (await loadOrganizations()).find((org) => org.id === id);
  const supabase = await userSupabase();
  if (!organization || !supabase) return null;
  const [invites, repositories, policies] = await Promise.all([
    canManage(organization.role) ? supabase.rpc("organization_invites_view", { org: id }) : Promise.resolve({ data: [] as Row[], error: null }),
    supabase.from("organization_repositories").select("id, repo_key").eq("org_id", id).order("repo_key"),
    supabase.from("organization_llm_policies").select("*").eq("org_id", id),
  ]);
  for (const result of [invites, repositories, policies]) if (result.error) throw new Error(result.error.message);
  return {
    organization,
    invites: ((invites.data ?? []) as Row[]).flatMap((row) => (isRole(row.role) ? [{
      id: row.id as string, username: (row.username as string) ?? null, email: (row.email as string) ?? null, role: row.role, expiresAt: row.expires_at as string,
    }] : [])),
    repositories: (repositories.data ?? []).map((row) => ({ id: row.id as string, repoKey: row.repo_key as string })),
    policies: (policies.data ?? []).map((row) => storedPolicy(row as Row)),
  };
}
