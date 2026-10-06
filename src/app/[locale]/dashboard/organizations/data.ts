import "server-only";
import { auth } from "@/auth";
import { isGitProvider, type GitProvider } from "@/modules/git/providers";
import { configuredProviders } from "@/modules/git/server";
import { MCP_AGENTS, type OrgMcpServer, type OrgSkill } from "@/modules/organizations/extensions";
import { storedCommandRules, type StoredCommandRules } from "@/modules/organizations/commands";
import { storedPolicy, type StoredPolicy } from "@/modules/organizations/policy";
import { canManage, isRole, type Role } from "@/modules/organizations/rules";
import { userSupabase } from "@/modules/supabase/server";

export interface Organization { id: string; name: string; slug: string; role: Role; members: number; repositories: number }
export interface PendingInvite { id: string; username: string | null; email: string | null; role: Role; expiresAt: string }
export interface Repository {
  id: string;
  repoKey: string;
  provider: GitProvider;
  path: string;
  /** O que o provedor disse ao associar; nulo no que foi colado por URL no app. */
  defaultBranch: string | null;
  private: boolean | null;
  description: string | null;
  webUrl: string | null;
  linkedVia: "url" | "provider";
}

/** A conta de um provedor que o owner conectou. */
export interface GitConnection {
  provider: GitProvider;
  account: string;
  connectedAt: string;
  /** A organização do provedor a que esta organização está presa; nula até o
   * owner escolher. */
  namespace: string | null;
}

export interface OrganizationDetail {
  organization: Organization;
  invites: PendingInvite[];
  repositories: Repository[];
  /** A política da organização e as dos repositórios dela. */
  policies: StoredPolicy[];
  /** As regras de comandos bloqueados da organização e as dos repositórios dela. */
  commandRules: StoredCommandRules[];
  connections: GitConnection[];
  /** Os servidores MCP da organização; só owner e maintainer os leem (levam segredos). */
  mcpServers: OrgMcpServer[];
  skills: OrgSkill[];
  /** Os provedores com o app configurado neste site (o GitHub, só pelo
   * GitHub App: a conta ou a organização é escolhida na tela do GitHub). */
  providers: GitProvider[];
}

type Row = Record<string, unknown>;

const tally = (rows: { org_id: string }[] | null) => {
  const counts: Record<string, number> = {};
  for (const row of rows ?? []) counts[row.org_id] = (counts[row.org_id] ?? 0) + 1;
  return counts;
};

/** O servidor MCP como o banco o guarda (`config` é o `McpServer` do app). */
function serverOf(row: Row): OrgMcpServer {
  const config = (row.config ?? {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const pairs = (value: unknown) => (value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item)])) : {});
  const list = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  return {
    name: text(config.name), transport: config.transport === "http" ? "http" : "stdio", command: text(config.command), args: list(config.args),
    env: pairs(config.env), url: text(config.url), headers: pairs(config.headers),
    agents: list(config.agents).filter((agent) => (MCP_AGENTS as readonly string[]).includes(agent)), enabled: row.enabled !== false,
  };
}

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
  const [invites, repositories, policies, commandRules, connections, mcpServers, skills] = await Promise.all([
    canManage(organization.role) ? supabase.rpc("organization_invites_view", { org: id }) : Promise.resolve({ data: [] as Row[], error: null }),
    supabase.from("organization_repositories")
      .select("id, repo_key, provider, path, default_branch, private, description, web_url, linked_via").eq("org_id", id).order("repo_key"),
    supabase.from("organization_llm_policies").select("*").eq("org_id", id),
    // Antes da migração das permissões, o resto da tela continua de pé.
    supabase.from("organization_command_rules").select("repository_id, blocked").eq("org_id", id),
    supabase.from("organization_git_connections").select("provider, account, connected_at, namespace").eq("org_id", id),
    supabase.from("organization_mcp_servers").select("config, enabled").eq("org_id", id).order("name"),
    supabase.from("organization_skills").select("name, description, body, enabled").eq("org_id", id).order("name"),
  ]);
  for (const result of [invites, repositories, policies, connections, mcpServers, skills]) if (result.error) throw new Error(result.error.message);
  return {
    organization,
    invites: ((invites.data ?? []) as Row[]).flatMap((row) => (isRole(row.role) ? [{
      id: row.id as string, username: (row.username as string) ?? null, email: (row.email as string) ?? null, role: row.role, expiresAt: row.expires_at as string,
    }] : [])),
    repositories: ((repositories.data ?? []) as Row[]).flatMap((row) => (isGitProvider(row.provider) ? [{
      id: row.id as string,
      repoKey: row.repo_key as string,
      provider: row.provider,
      path: row.path as string,
      defaultBranch: (row.default_branch as string) ?? null,
      private: typeof row.private === "boolean" ? row.private : null,
      description: (row.description as string) ?? null,
      webUrl: (row.web_url as string) ?? null,
      linkedVia: row.linked_via === "provider" ? "provider" as const : "url" as const,
    }] : [])),
    policies: (policies.data ?? []).map((row) => storedPolicy(row as Row)),
    commandRules: commandRules.error ? [] : (commandRules.data ?? []).map((row) => storedCommandRules(row as Row)),
    connections: ((connections.data ?? []) as Row[]).flatMap((row) => (isGitProvider(row.provider) ? [{
      provider: row.provider, account: row.account as string, connectedAt: row.connected_at as string, namespace: (row.namespace as string) ?? null,
    }] : [])),
    mcpServers: ((mcpServers.data ?? []) as Row[]).map((row) => serverOf(row)),
    skills: ((skills.data ?? []) as Row[]).map((row) => ({
      name: row.name as string, description: row.description as string, body: row.body as string, enabled: row.enabled !== false,
    })),
    providers: configuredProviders(),
  };
}
