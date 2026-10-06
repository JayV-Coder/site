import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { cleanNamespace, GIT_PROVIDERS, inNamespace, matches, namespaceOk, NORMALIZE, OAUTH, type GitNamespace, type GitProvider, type GitRepository } from "./providers";
import { randomText, seal, tokenOf, unseal, withToken, type GitState, type GitTokens } from "./seal";

/** Cada provedor precisa de um app próprio do site (o login do JayV continua
 * no Supabase), com o retorno em `<site>/api/git/callback`:
 *   GIT_GITHUB_CLIENT_ID / GIT_GITHUB_CLIENT_SECRET / GIT_GITHUB_APP_SLUG
 *                                                            (GitHub › GitHub Apps)
 *   GIT_GITLAB_CLIENT_ID / GIT_GITLAB_CLIENT_SECRET          (GitLab › Applications, escopo read_api)
 *   GIT_BITBUCKET_CLIENT_ID / GIT_BITBUCKET_CLIENT_SECRET    (Bitbucket › OAuth consumers, Repositories: Read e Account: Read)
 * Sem elas, o provedor aparece indisponível no painel.
 *
 * O GitHub é só por GitHub App (OAuth App não serve mais): o slug é o nome do
 * app na URL github.com/apps/<slug>, e Client ID/secret são os do próprio
 * app. Conectar abre a tela do GitHub de escolher onde instalar — a conta
 * pessoal ou uma organização, e quais repositórios — a cada vez e em cada
 * organização do JayV. No app: Setup URL e Callback URL =
 * <site>/api/git/callback, "Redirect on update" ligado, permissões de
 * repositório Metadata e Contents só leitura. */
const ENV: Record<GitProvider, [string, string]> = {
  github: ["GIT_GITHUB_CLIENT_ID", "GIT_GITHUB_CLIENT_SECRET"],
  gitlab: ["GIT_GITLAB_CLIENT_ID", "GIT_GITLAB_CLIENT_SECRET"],
  bitbucket: ["GIT_BITBUCKET_CLIENT_ID", "GIT_BITBUCKET_CLIENT_SECRET"],
};

function appSlug() {
  const slug = process.env.GIT_GITHUB_APP_SLUG?.trim();
  return slug && /^[a-z0-9-]+$/i.test(slug) ? slug : null;
}

/** As credenciais do provedor; no GitHub, só com o slug do GitHub App. */
export function gitClient(provider: GitProvider) {
  const [idName, secretName] = ENV[provider];
  const id = process.env[idName]?.trim();
  const secret = process.env[secretName]?.trim();
  if (provider === "github" && !appSlug()) return null;
  return id && secret ? { id, secret } : null;
}

export const configuredProviders = () => GIT_PROVIDERS.filter((provider) => gitClient(provider));

export const githubAppSlug = () => (gitClient("github") ? appSlug() : null);

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET");
  return secret;
}

export const STATE_COOKIE = "jayv.git.state";
export const TOKENS_COOKIE = "jayv.git";
/** O token do provedor vale uma hora no site; depois, entrar de novo. */
export const TOKEN_TTL = 60 * 60;
const STATE_TTL = 10 * 60;

/** O mesmo endereço que o navegador usa, atrás de proxy ou não. */
export async function requestOrigin() {
  const request = await headers();
  const host = request.get("x-forwarded-host") ?? request.get("host");
  const origin = request.get("origin") ?? (host ? `${request.get("x-forwarded-proto") ?? "https"}://${host}` : null);
  if (!origin) throw new Error("unknown origin");
  return origin;
}

const cookieOptions = (secure: boolean, maxAge: number) => ({ httpOnly: true, sameSite: "lax" as const, secure, maxAge, path: "/" });

export function pkcePair() {
  const verifier = randomText(48);
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

export const stateCookie = (state: GitState) =>
  ({ name: STATE_COOKIE, value: seal(state, authSecret(), "state"), options: cookieOptions(state.redirectUri.startsWith("https://"), STATE_TTL) });

export async function saveState(state: GitState) {
  const cookie = stateCookie(state);
  (await cookies()).set(cookie.name, cookie.value, cookie.options);
}

export const readState = (raw: string | undefined) => unseal<GitState>(raw, authSecret(), "state");

const readJar = (raw: string | undefined) => unseal<GitTokens>(raw, authSecret(), "tokens");

/** O token guardado deste provedor para quem entrou, se ainda valer. */
export async function storedToken(user: string, org: string, provider: GitProvider) {
  return tokenOf(readJar((await cookies()).get(TOKENS_COOKIE)?.value), user, org, provider);
}

/** O cookie com o token novo (ou sem o deste provedor), para quem o grava:
 * a rota de retorno põe na resposta; a ação, no `cookies()`. */
export function tokensCookie(raw: string | undefined, user: string, org: string, provider: GitProvider, entry: { token: string; account: string; installation?: number } | null, secure: boolean) {
  const jar = withToken(readJar(raw), user, org, provider, entry ? { ...entry, expiresAt: Date.now() + TOKEN_TTL * 1000 } : null);
  return { name: TOKENS_COOKIE, value: seal(jar, authSecret(), "tokens"), options: cookieOptions(secure, TOKEN_TTL) };
}

/** O token foi recusado (vencido ou revogado): é preciso entrar de novo. */
export class GitExpired extends Error {}

const TIMEOUT_MS = 10_000;

function apiHeaders(provider: GitProvider, token: string): Record<string, string> {
  const base = { Authorization: `Bearer ${token}`, "User-Agent": "jayv-site" };
  return provider === "github" ? { ...base, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } : { ...base, Accept: "application/json" };
}

/** Uma leitura da API do provedor: 401 vira `GitExpired`; 404 (e o 403 do
 * Bitbucket, para repositório privado de outro) vira nulo. */
async function api<T>(provider: GitProvider, token: string, url: string): Promise<{ body: T; response: Response } | null> {
  const response = await fetch(url, { headers: apiHeaders(provider, token), cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (response.status === 401) throw new GitExpired(provider);
  if (response.status === 404 || (response.status === 403 && provider === "bitbucket")) return null;
  if (!response.ok) throw new Error(`${provider} ${new URL(url).pathname}: ${response.status}`);
  return { body: (await response.json()) as T, response };
}

/** Troca o código da volta pelo token. */
export async function exchangeCode(provider: GitProvider, code: string, redirectUri: string, verifier: string | null) {
  const client = gitClient(provider);
  if (!client) throw new Error(`${provider} not configured`);
  const form = new URLSearchParams({ grant_type: "authorization_code", code });
  const requestHeaders: Record<string, string> = { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" };
  if (provider === "bitbucket") {
    requestHeaders.Authorization = `Basic ${Buffer.from(`${client.id}:${client.secret}`).toString("base64")}`;
  } else {
    form.set("client_id", client.id);
    form.set("client_secret", client.secret);
    form.set("redirect_uri", redirectUri);
    if (verifier) form.set("code_verifier", verifier);
  }
  const response = await fetch(OAUTH[provider].token, { method: "POST", headers: requestHeaders, body: form, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body = (await response.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!response.ok || !body.access_token) throw new Error(`${provider} token: ${response.status} ${body.error ?? ""}`.trim());
  return body.access_token;
}

/** O nome da conta que entrou, para o painel mostrar qual foi conectada. */
export async function accountName(provider: GitProvider, token: string): Promise<string> {
  const urls: Record<GitProvider, string> = {
    github: "https://api.github.com/user",
    gitlab: "https://gitlab.com/api/v4/user",
    bitbucket: "https://api.bitbucket.org/2.0/user",
  };
  const found = await api<Record<string, unknown>>(provider, token, urls[provider]);
  const user = found?.body ?? {};
  const name = [user.login, user.username, user.nickname, user.display_name].find((value) => typeof value === "string" && value.trim());
  return String(name ?? provider).trim().slice(0, 100);
}

/** Quantas páginas de 100 a lista lê, no máximo. */
const PAGES = 5;

/** A instalação do GitHub App que a pessoa acabou de escolher, se ela de
 * fato a alcança: o dono dela (conta ou organização) vira a organização do
 * provedor desta organização do JayV. */
export async function githubInstallation(token: string, id: number): Promise<{ namespace: string } | null> {
  for (let page = 1; page <= PAGES; page++) {
    const body = (await api<{ installations?: { id?: unknown; account?: { login?: unknown } }[] }>("github", token,
      `https://api.github.com/user/installations?per_page=100&page=${page}`))?.body;
    const list = body?.installations ?? [];
    const found = list.find((item) => item.id === id);
    if (found) {
      const namespace = typeof found.account?.login === "string" ? cleanNamespace(found.account.login) : "";
      return namespaceOk(namespace) ? { namespace } : null;
    }
    if (list.length < 100) break;
  }
  return null;
}

/** As organizações do provedor que a conta alcança — no GitHub, as contas e
 * organizações onde o GitHub App está instalado e a pessoa tem acesso; os
 * grupos do GitLab ou os workspaces do Bitbucket —, para o owner prender a
 * organização do JayV a uma delas. */
export async function listNamespaces(provider: GitProvider, token: string, account: string): Promise<GitNamespace[]> {
  const found: GitNamespace[] = [];
  const add = (raw: unknown, label: unknown, personal: boolean) => {
    const name = typeof raw === "string" ? cleanNamespace(raw) : "";
    if (namespaceOk(name) && !found.some((known) => known.name === name)) {
      found.push({ name, label: typeof label === "string" && label.trim() ? label.trim().slice(0, 100) : name, personal });
    }
  };
  if (provider === "github") {
    for (let page = 1; page <= PAGES; page++) {
      const list = (await api<{ installations?: { account?: { login?: unknown } }[] }>(provider, token,
        `https://api.github.com/user/installations?per_page=100&page=${page}`))?.body.installations ?? [];
      list.forEach((item) => {
        const login = item.account?.login;
        add(login, login, typeof login === "string" && cleanNamespace(login) === cleanNamespace(account));
      });
      if (list.length < 100) break;
    }
  } else if (provider === "gitlab") {
    add(account, account, true);
    for (let page = 1; page <= PAGES; page++) {
      const result = await api<Record<string, unknown>[]>(provider, token, `https://gitlab.com/api/v4/groups?min_access_level=10&per_page=100&page=${page}`);
      (result?.body ?? []).forEach((row) => add(row.full_path, row.full_name, false));
      if (!result?.response.headers.get("x-next-page")) break;
    }
  } else {
    let url: string | null = "https://api.bitbucket.org/2.0/user/permissions/workspaces?pagelen=100";
    for (let page = 1; url && page <= PAGES; page++) {
      const result = await api<{ values?: { workspace?: { slug?: unknown; name?: unknown } }[]; next?: string }>(provider, token, url);
      (result?.body.values ?? []).forEach((row) => add(row.workspace?.slug, row.workspace?.name, false));
      const next: unknown = result?.body.next;
      url = typeof next === "string" && next.startsWith("https://api.bitbucket.org/") ? next : null;
    }
  }
  return found;
}

/** Os repositórios da organização do provedor escolhida (`namespace`), do
 * mais mexido ao menos, filtrados pela busca. Só entram os que estão nela:
 * os de outras organizações que a mesma conta alcança ficam de fora.
 * `truncated` diz que havia mais do que as páginas lidas. */
export async function listRepositories(provider: GitProvider, token: string, query: string, namespace: string, account: string, installation?: number): Promise<{ repositories: GitRepository[]; truncated: boolean }> {
  const found: GitRepository[] = [];
  let truncated = false;
  const space = encodeURIComponent(namespace);
  const personal = namespace === cleanNamespace(account);
  if (provider === "github") {
    // GitHub App: só os repositórios que a pessoa liberou nesta instalação.
    // Um token sem instalação vem da conexão antiga por OAuth App: é preciso
    // conectar de novo, agora pelo GitHub App.
    if (!installation) throw new GitExpired(provider);
    for (let page = 1; page <= PAGES; page++) {
      const rows = (await api<{ repositories?: Record<string, unknown>[] }>(provider, token,
        `https://api.github.com/user/installations/${installation}/repositories?per_page=100&page=${page}`))?.body.repositories ?? [];
      found.push(...rows.flatMap((row) => NORMALIZE.github(row) ?? []));
      truncated = rows.length === 100 && page === PAGES;
      if (rows.length < 100) break;
    }
  } else if (provider === "gitlab") {
    // O GitLab busca no servidor.
    const search = query.trim() ? `&search=${encodeURIComponent(query.trim())}` : "";
    const base = personal
      ? `https://gitlab.com/api/v4/users/${space}/projects?order_by=last_activity_at`
      : `https://gitlab.com/api/v4/groups/${space}/projects?include_subgroups=true&order_by=last_activity_at`;
    for (let page = 1; page <= PAGES; page++) {
      const result = await api<Record<string, unknown>[]>(provider, token, `${base}&per_page=100&page=${page}${search}`);
      found.push(...(result?.body ?? []).flatMap((row) => NORMALIZE.gitlab(row) ?? []));
      const next = result?.response.headers.get("x-next-page");
      truncated = !!next && page === PAGES;
      if (!next) break;
    }
  } else {
    const filter = query.trim() ? `&q=${encodeURIComponent(`full_name ~ "${query.trim().replace(/["\\]/g, "")}"`)}` : "";
    let url: string | null = `https://api.bitbucket.org/2.0/repositories/${space}?role=member&pagelen=100&sort=-updated_on${filter}`;
    for (let page = 1; url && page <= PAGES; page++) {
      const result = await api<{ values?: Record<string, unknown>[]; next?: string }>(provider, token, url);
      found.push(...(result?.body.values ?? []).flatMap((row) => NORMALIZE.bitbucket(row) ?? []));
      // Só segue o `next` do próprio Bitbucket.
      const next: unknown = result?.body.next;
      url = typeof next === "string" && next.startsWith("https://api.bitbucket.org/") ? next : null;
      truncated = !!url && page === PAGES;
    }
  }
  return { repositories: found.filter((repository) => inNamespace(repository.path, namespace) && matches(repository, query)), truncated };
}

/** Um repositório pelo caminho, como a conta o vê; nulo se ela não alcança. */
export async function getRepository(provider: GitProvider, token: string, path: string): Promise<GitRepository | null> {
  const urls: Record<GitProvider, string> = {
    github: `https://api.github.com/repos/${path.split("/").map(encodeURIComponent).join("/")}`,
    gitlab: `https://gitlab.com/api/v4/projects/${encodeURIComponent(path)}`,
    bitbucket: `https://api.bitbucket.org/2.0/repositories/${path.split("/").map(encodeURIComponent).join("/")}`,
  };
  // Um repositório renomeado chega pelo redirecionamento do provedor: vale o
  // caminho atual, o que ele devolve.
  const result = await api<Record<string, unknown>>(provider, token, urls[provider]);
  return result ? NORMALIZE[provider](result.body) : null;
}
