import { describe, expect, it } from "vitest";
import { authorizeUrl, cleanPath, fromBitbucket, fromGithub, fromGitlab, linkPayload, matches, pathOk, repoKey } from "./providers";
import { sameText, seal, tokenOf, unseal, withToken, type GitTokens } from "./seal";

describe("git provider login", () => {
  it("sends the redirect and the scope GitHub and GitLab need", () => {
    const github = new URL(authorizeUrl("github", "id-1", "https://site.test/api/git/callback", "st"));
    expect(github.origin + github.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(github.searchParams.get("redirect_uri")).toBe("https://site.test/api/git/callback");
    expect(github.searchParams.get("scope")).toBe("repo read:org");
    expect(github.searchParams.get("state")).toBe("st");
    expect(github.searchParams.has("code_challenge")).toBe(false);

    const gitlab = new URL(authorizeUrl("gitlab", "id-2", "https://site.test/api/git/callback", "st", "challenge"));
    expect(gitlab.searchParams.get("scope")).toBe("read_api");
    expect(gitlab.searchParams.get("code_challenge")).toBe("challenge");
    expect(gitlab.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("leaves Bitbucket's redirect and scope to the consumer", () => {
    const bitbucket = new URL(authorizeUrl("bitbucket", "key", "https://site.test/api/git/callback", "st"));
    expect(bitbucket.searchParams.has("redirect_uri")).toBe(false);
    expect(bitbucket.searchParams.has("scope")).toBe(false);
    expect(bitbucket.searchParams.get("response_type")).toBe("code");
  });
});

describe("repository paths", () => {
  it("follow the database rule", () => {
    expect(cleanPath(" /Acme/API.git/ ")).toBe("acme/api");
    expect(pathOk("acme/api")).toBe(true);
    expect(pathOk("group/sub/project")).toBe(true);
    expect(pathOk("only-one")).toBe(false);
    expect(pathOk("acme/api.git")).toBe(false);
    expect(pathOk("acme/my api")).toBe(false);
    expect(repoKey("bitbucket", "team/web")).toBe("bitbucket.org/team/web");
  });
});

describe("provider answers", () => {
  it("reads a GitHub repository", () => {
    const repository = fromGithub({
      id: 42, full_name: "Acme/API", private: true, default_branch: "main", description: " The API ", html_url: "https://github.com/Acme/API",
    });
    expect(repository).toEqual({
      provider: "github", path: "acme/api", name: "Acme/API", externalId: "42", defaultBranch: "main", private: true, description: "The API", webUrl: "https://github.com/Acme/API",
    });
    expect(linkPayload(repository!)).toEqual({
      path: "acme/api", external_id: "42", default_branch: "main", private: true, description: "The API", web_url: "https://github.com/Acme/API",
    });
  });

  it("treats GitLab's internal as private and keeps subgroups", () => {
    const repository = fromGitlab({ id: 7, path_with_namespace: "Group/Sub/Project", visibility: "internal", default_branch: null, web_url: "https://gitlab.com/group/sub/project" });
    expect(repository?.path).toBe("group/sub/project");
    expect(repository?.private).toBe(true);
    expect(repository?.defaultBranch).toBeNull();
    expect(fromGitlab({ path_with_namespace: "a/b", visibility: "public" })?.private).toBe(false);
  });

  it("reads Bitbucket's nested fields", () => {
    const repository = fromBitbucket({
      uuid: "{abc}", full_name: "team/web", is_private: false, mainbranch: { name: "develop" }, links: { html: { href: "https://bitbucket.org/team/web" } },
    });
    expect(repository).toMatchObject({ path: "team/web", externalId: "{abc}", defaultBranch: "develop", private: false, webUrl: "https://bitbucket.org/team/web" });
  });

  it("drops what the database would refuse", () => {
    expect(fromGithub({ full_name: "no-owner" })).toBeNull();
    expect(fromGithub({ name: "missing-full-name" })).toBeNull();
    expect(fromGithub({ full_name: "a/b", html_url: "javascript:alert(1)" })?.webUrl).toBeNull();
    expect(fromGithub({ full_name: "a/b", description: "x".repeat(400) })?.description).toHaveLength(300);
  });

  it("searches by path and description, ignoring case and accents", () => {
    const repository = fromGithub({ full_name: "acme/api", description: "Serviço de cobrança" })!;
    expect(matches(repository, "API")).toBe(true);
    expect(matches(repository, "servico")).toBe(true);
    expect(matches(repository, "web")).toBe(false);
    expect(matches(repository, "  ")).toBe(true);
  });
});

describe("sealed cookies", () => {
  const secret = "test-secret-with-enough-entropy";

  it("round-trip only with the same secret and purpose", () => {
    const sealed = seal({ token: "gho_x" }, secret, "tokens");
    expect(sealed).not.toContain("gho_x");
    expect(unseal(sealed, secret, "tokens")).toEqual({ token: "gho_x" });
    expect(unseal(sealed, "another-secret", "tokens")).toBeNull();
    expect(unseal(sealed, secret, "state")).toBeNull();
  });

  it("refuse a tampered or empty value", () => {
    const sealed = seal({ a: 1 }, secret, "state");
    const tampered = `${sealed.slice(0, -2)}${sealed.endsWith("A") ? "B" : "A"}A`;
    expect(unseal(tampered, secret, "state")).toBeNull();
    expect(unseal("", secret, "state")).toBeNull();
    expect(unseal(undefined, secret, "state")).toBeNull();
  });

  it("compare the state in constant time", () => {
    expect(sameText("abc", "abc")).toBe(true);
    expect(sameText("abc", "abd")).toBe(false);
    expect(sameText("abc", "abcd")).toBe(false);
  });
});

describe("token jar", () => {
  const entry = { token: "t", account: "acme", expiresAt: 2_000 };

  it("gives the token only to its owner, before it expires", () => {
    const jar: GitTokens = { user: "u1", tokens: { github: entry } };
    expect(tokenOf(jar, "u1", "github", 1_000)).toEqual(entry);
    expect(tokenOf(jar, "u1", "github", 2_000)).toBeNull();
    expect(tokenOf(jar, "u2", "github", 1_000)).toBeNull();
    expect(tokenOf(jar, "u1", "gitlab", 1_000)).toBeNull();
    expect(tokenOf(null, "u1", "github", 1_000)).toBeNull();
  });

  it("drops someone else's tokens when another person connects", () => {
    const jar: GitTokens = { user: "u1", tokens: { github: entry } };
    expect(withToken(jar, "u2", "gitlab", entry)).toEqual({ user: "u2", tokens: { gitlab: entry } });
    expect(withToken(jar, "u1", "gitlab", entry).tokens).toEqual({ github: entry, gitlab: entry });
    expect(withToken(jar, "u1", "github", null).tokens).toEqual({});
  });
});
