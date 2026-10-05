/** Os provedores git onde a organização guarda o código: o owner entra num
 * deles (OAuth do próprio site, separado do login do JayV), escolhe os
 * repositórios e o app de cada membro passa a listá-los para clonar.
 *
 * Aqui fica só o que não depende do servidor: os endereços de cada provedor,
 * o que cada API devolve traduzido para um formato só e as regras de caminho
 * — as mesmas de `organization_repositories` no banco. */
export type GitProvider = "github" | "gitlab" | "bitbucket";
export const GIT_PROVIDERS: GitProvider[] = ["github", "gitlab", "bitbucket"];

export const isGitProvider = (value: unknown): value is GitProvider => GIT_PROVIDERS.includes(value as GitProvider);

/** O host de cada provedor, o mesmo do `repo_key` do banco. */
export const GIT_HOSTS: Record<GitProvider, string> = { github: "github.com", gitlab: "gitlab.com", bitbucket: "bitbucket.org" };

/** Um repositório como o provedor o descreve, já no formato do banco. */
export interface GitRepository {
  provider: GitProvider;
  /** `dono/nome` (no GitLab, com os subgrupos), em minúsculas e sem `.git`. */
  path: string;
  /** Como o provedor escreve o caminho, para mostrar. */
  name: string;
  externalId: string | null;
  defaultBranch: string | null;
  private: boolean | null;
  description: string | null;
  webUrl: string | null;
}

interface OAuthEndpoints {
  authorize: string;
  token: string;
  /** No Bitbucket o escopo é o do consumidor OAuth, configurado lá. */
  scope: string | null;
  /** Só o GitLab aceita PKCE nos apps confidenciais; nos outros vale o `state`. */
  pkce: boolean;
}

/** GitHub: `repo` é o único escopo que lista os privados (só leitura não
 * existe nos OAuth Apps); `read:org` traz os das organizações. O token só é
 * usado na hora, no servidor, e nunca vai ao banco. */
export const OAUTH: Record<GitProvider, OAuthEndpoints> = {
  github: { authorize: "https://github.com/login/oauth/authorize", token: "https://github.com/login/oauth/access_token", scope: "repo read:org", pkce: false },
  gitlab: { authorize: "https://gitlab.com/oauth/authorize", token: "https://gitlab.com/oauth/token", scope: "read_api", pkce: true },
  bitbucket: { authorize: "https://bitbucket.org/site/oauth2/authorize", token: "https://bitbucket.org/site/oauth2/access_token", scope: null, pkce: false },
};

/** O endereço do login no provedor. O Bitbucket usa o retorno cadastrado no
 * consumidor; os outros recebem o mesmo `redirect_uri` da troca do código. */
export function authorizeUrl(provider: GitProvider, clientId: string, redirectUri: string, state: string, challenge?: string) {
  const endpoints = OAUTH[provider];
  const query = new URLSearchParams({ client_id: clientId, response_type: "code", state });
  if (provider !== "bitbucket") query.set("redirect_uri", redirectUri);
  if (endpoints.scope) query.set("scope", endpoints.scope);
  if (provider === "github") query.set("allow_signup", "false");
  if (endpoints.pkce && challenge) {
    query.set("code_challenge", challenge);
    query.set("code_challenge_method", "S256");
  }
  return `${endpoints.authorize}?${query}`;
}

/** A mesma regra de `organization_repositories.path`: dois ou mais trechos de
 * `[a-z0-9._-]`, sem `.git` no fim. */
export const PATH_RULE = /^[a-z0-9._-]+(\/[a-z0-9._-]+)+$/;

export function cleanPath(raw: string) {
  return raw.trim().replace(/^\/+|\/+$/g, "").toLowerCase().replace(/\.git$/, "");
}

export const pathOk = (path: string) => PATH_RULE.test(path) && !path.endsWith(".git");

export const repoKey = (provider: GitProvider, path: string) => `${GIT_HOSTS[provider]}/${path}`;

type Raw = Record<string, unknown>;

const text = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null);
const https = (value: unknown) => (typeof value === "string" && value.startsWith("https://") ? value.slice(0, 500) : null);
const id = (value: unknown) => (typeof value === "number" || (typeof value === "string" && value) ? String(value).slice(0, 100) : null);

function repository(provider: GitProvider, name: unknown, fields: Omit<GitRepository, "provider" | "path" | "name">): GitRepository | null {
  if (typeof name !== "string") return null;
  const path = cleanPath(name);
  if (!pathOk(path)) return null;
  return { provider, path, name: name.replace(/\.git$/, ""), ...fields };
}

/** `GET /user/repos` e `GET /repos/{dono}/{nome}` do GitHub. */
export function fromGithub(raw: Raw): GitRepository | null {
  return repository("github", raw.full_name, {
    externalId: id(raw.id),
    defaultBranch: text(raw.default_branch, 200),
    private: typeof raw.private === "boolean" ? raw.private : null,
    description: text(raw.description, 300),
    webUrl: https(raw.html_url),
  });
}

/** `GET /projects` do GitLab: `internal` (visível a quem tem conta) conta
 * como privado, porque um clone anônimo não passa. */
export function fromGitlab(raw: Raw): GitRepository | null {
  return repository("gitlab", raw.path_with_namespace, {
    externalId: id(raw.id),
    defaultBranch: text(raw.default_branch, 200),
    private: typeof raw.visibility === "string" ? raw.visibility !== "public" : null,
    description: text(raw.description, 300),
    webUrl: https(raw.web_url),
  });
}

/** `GET /2.0/repositories` do Bitbucket. */
export function fromBitbucket(raw: Raw): GitRepository | null {
  const links = (raw.links ?? {}) as { html?: { href?: unknown } };
  const branch = (raw.mainbranch ?? {}) as { name?: unknown };
  return repository("bitbucket", raw.full_name, {
    externalId: id(raw.uuid),
    defaultBranch: text(branch.name, 200),
    private: typeof raw.is_private === "boolean" ? raw.is_private : null,
    description: text(raw.description, 300),
    webUrl: https(links.html?.href),
  });
}

export const NORMALIZE: Record<GitProvider, (raw: Raw) => GitRepository | null> = { github: fromGithub, gitlab: fromGitlab, bitbucket: fromBitbucket };

/** A busca da lista: pelo caminho e pela descrição, sem diferença de
 * maiúsculas nem de acento. */
export function matches(repository: GitRepository, query: string) {
  const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const wanted = fold(query.trim());
  if (!wanted) return true;
  return fold(repository.path).includes(wanted) || fold(repository.description ?? "").includes(wanted);
}

/** O que o banco recebe em `org_link_repositories`. */
export const linkPayload = (repository: GitRepository) => ({
  path: repository.path,
  external_id: repository.externalId,
  default_branch: repository.defaultBranch,
  private: repository.private,
  description: repository.description,
  web_url: repository.webUrl,
});

/** Quantos repositórios uma associação aceita de uma vez (o banco aceita 200;
 * cada um é conferido no provedor antes). */
export const LINK_MAX = 50;
