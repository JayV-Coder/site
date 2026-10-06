"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import {
  authorizeUrl, cleanNamespace, inNamespace, isGitProvider, LINK_MAX, linkPayload, namespaceOk, OAUTH, pathOk, type GitNamespace, type GitProvider, type GitRepository,
} from "@/modules/git/providers";
import { randomText } from "@/modules/git/seal";
import {
  GitExpired, getRepository, gitClient, listNamespaces, listRepositories, pkcePair, requestOrigin, saveState, storedToken, tokensCookie, TOKENS_COOKIE,
} from "@/modules/git/server";
import { looksLikeLocale } from "@/modules/i18n/render";
import type { Text } from "@/modules/i18n/types";
import { policyOk, policyPayload, type LlmPolicy } from "@/modules/organizations/policy";
import { INVITE_ROLES, orgFailure, slugOk, type Role } from "@/modules/organizations/rules";
import { userSupabase } from "@/modules/supabase/server";
import { loadOrganizations } from "./data";

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Quem entrou, se for owner desta organização. O banco confere de novo em
 * cada RPC; aqui é para não abrir o provedor nem gastar o token à toa. */
async function ownerOf(org: string) {
  if (!UUID.test(org)) return null;
  const [session, organizations] = await Promise.all([auth(), loadOrganizations()]);
  const user = session?.user.id;
  return user && organizations.some((known) => known.id === org && known.role === "owner") ? user : null;
}

const forbidden = { ok: false, error: { key: "org.forbidden" } } as const;
const expired = { ok: false, error: { key: "org.gitExpired" } } as const;
const unavailable = { ok: false, error: { key: "org.gitUnavailable" } } as const;

/** Conectar (ou reconectar) o provedor: devolve o endereço do login nele. A
 * volta é por `/api/git/callback`, que grava a conta conectada e guarda o
 * token só no cookie cifrado. `pick` abre a lista do provedor ao voltar.
 *
 * No GitHub (só por GitHub App) é a autorização da pessoa, que sempre volta
 * para o site; a volta abre a escolha entre as contas e organizações onde o
 * app já está instalado, ou a tela de instalar quando não há nenhuma. A tela
 * de instalar não serve de começo: numa conta ou organização onde o app já
 * está instalado, o GitHub abre as configurações da instalação e não volta. */
export async function startGitConnection(org: string, provider: GitProvider, locale: string, pick = false): Promise<ActionResult<string>> {
  // O idioma vira o começo do endereço da volta: só um idioma de verdade.
  if (!isGitProvider(provider) || !looksLikeLocale(locale)) return forbidden;
  const client = gitClient(provider);
  if (!client) return unavailable;
  const user = await ownerOf(org);
  if (!user) return forbidden;
  try {
    const redirectUri = `${await requestOrigin()}/api/git/callback`;
    const state = randomText(24);
    const pair = OAUTH[provider].pkce ? pkcePair() : null;
    await saveState({ state, verifier: pair?.verifier ?? null, provider, org, locale, user, redirectUri, pick, installation: null });
    return { ok: true, data: authorizeUrl(provider, client.id, redirectUri, state, pair?.challenge) };
  } catch (error) {
    console.error("git start", error);
    return unavailable;
  }
}

/** Desconectar tira a conta e o token deste navegador; os repositórios
 * continuam na organização até o owner removê-los. */
export async function disconnectGit(org: string, provider: GitProvider) {
  if (!isGitProvider(provider)) return forbidden;
  const result = await call<null>("org_disconnect_git", { org, provider });
  const session = await auth();
  if (result.ok && session?.user.id) {
    const store = await cookies();
    const cookie = tokensCookie(store.get(TOKENS_COOKIE)?.value, session.user.id, org, provider, null, (await requestOrigin()).startsWith("https://"));
    store.set(cookie.name, cookie.value, cookie.options);
  }
  return result;
}

/** A conexão desta organização com o provedor, como o banco a guarda: a
 * conta e a organização do provedor escolhida (nula até o owner escolher). */
async function connectionOf(org: string, provider: GitProvider) {
  const supabase = await userSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("organization_git_connections").select("account, namespace").eq("org_id", org).eq("provider", provider).maybeSingle();
  return data ? { account: data.account as string, namespace: (data.namespace as string | null) ?? null } : null;
}

/** Roda com o token desta organização. O token só vale se for da conta que
 * está conectada nela agora: uma reconexão com outra conta (em outro
 * navegador, ou noutra aba) invalida o que ficou no cookie. */
async function withToken<T>(
  org: string, provider: GitProvider,
  run: (token: string, connection: { account: string; namespace: string | null }) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  if (!isGitProvider(provider)) return forbidden;
  const user = await ownerOf(org);
  if (!user) return forbidden;
  const [stored, connection] = await Promise.all([storedToken(user, org, provider), connectionOf(org, provider)]);
  if (!connection) return { ok: false, error: { key: "org.gitNotConnected" } };
  if (!stored || stored.account !== connection.account) return expired;
  try {
    return await run(stored.token, connection);
  } catch (error) {
    if (error instanceof GitExpired) return expired;
    console.error("git", provider, error);
    return unavailable;
  }
}

const namespaceMissing = { ok: false, error: { key: "org.gitNamespaceMissing" } } as const;

/** As organizações do provedor que a conta conectada alcança, para o owner
 * escolher a desta organização do JayV. */
export async function listGitNamespaces(org: string, provider: GitProvider) {
  return withToken<GitNamespace[]>(org, provider, async (token, connection) => ({
    ok: true, data: await listNamespaces(provider, token, connection.account),
  }));
}

/** Prende esta organização do JayV a uma organização do provedor, depois de
 * conferir que a conta conectada a alcança. */
export async function chooseGitNamespace(org: string, provider: GitProvider, namespace: string) {
  const wanted = typeof namespace === "string" ? cleanNamespace(namespace) : "";
  if (!namespaceOk(wanted)) return { ok: false, error: { key: "org.repoInvalid" } } as const;
  return withToken<null>(org, provider, async (token, connection) => {
    const reachable = await listNamespaces(provider, token, connection.account);
    if (!reachable.some((known) => known.name === wanted)) return forbidden;
    return call<null>("org_choose_git_namespace", { org, provider, namespace: wanted });
  });
}

/** A lista da organização do provedor escolhida, para o owner marcar. */
export async function listGitRepositories(org: string, provider: GitProvider, query: string) {
  return withToken<{ repositories: GitRepository[]; truncated: boolean }>(org, provider, async (token, connection) => {
    if (!connection.namespace) return namespaceMissing;
    return { ok: true, data: await listRepositories(provider, token, typeof query === "string" ? query.slice(0, 100) : "", connection.namespace, connection.account) };
  });
}

/** Associa os escolhidos. Cada um é lido de novo no provedor com o token: só
 * entra o que a conta conectada alcança e que é da organização do provedor
 * desta organização do JayV, com os dados que o provedor dá (o navegador
 * manda só os caminhos). Devolve quantos entraram e os que ficaram de fora. */
export async function linkGitRepositories(org: string, provider: GitProvider, paths: string[]) {
  const wanted = Array.isArray(paths) ? [...new Set(paths)] : [];
  if (wanted.length === 0 || wanted.length > LINK_MAX || !wanted.every((path) => typeof path === "string" && pathOk(path))) {
    return { ok: false, error: { key: "org.repoInvalid" } } as const;
  }
  return withToken<{ linked: number; missing: string[] }>(org, provider, async (token, connection) => {
    const namespace = connection.namespace;
    if (!namespace) return namespaceMissing;
    const found: GitRepository[] = [];
    const missing: string[] = wanted.filter((path) => !inNamespace(path, namespace));
    const inside = wanted.filter((path) => inNamespace(path, namespace));
    // Dez de cada vez, para não estourar o limite do provedor.
    for (let start = 0; start < inside.length; start += 10) {
      const batch = inside.slice(start, start + 10);
      const results = await Promise.all(batch.map((path) => getRepository(provider, token, path)));
      results.forEach((repository, index) => (repository && inNamespace(repository.path, namespace) ? found.push(repository) : missing.push(batch[index])));
    }
    if (found.length === 0) return { ok: true, data: { linked: 0, missing } };
    const result = await call<number>("org_link_repositories", { org, provider, repositories: found.map(linkPayload) });
    return result.ok ? { ok: true, data: { linked: result.data, missing } } : result;
  });
}

/** Tirar um repositório da organização (só o owner). */
export async function removeRepository(repository: string) {
  if (!UUID.test(repository)) return forbidden;
  return call<null>("remove_repository", { repository });
}
