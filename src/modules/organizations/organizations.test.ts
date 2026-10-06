import { describe, expect, it } from "vitest";
import { emptyPolicy, policyLines, policyOk, policyPayload, policyProblems, storedPolicy } from "./policy";
import { canDelete, canManage, orgFailure, slugify, slugOk } from "./rules";

describe("organization rules", () => {
  it("suggests a slug from the name", () => {
    expect(slugify("Ação & Cia Ltda.")).toBe("acao-cia-ltda");
    expect(slugify("  Acme  ")).toBe("acme");
  });

  it("checks the database slug rule", () => {
    for (const slug of ["acme", "a1b", "minha-org", "x".repeat(40)]) expect(slugOk(slug), slug).toBe(true);
    for (const slug of ["ab", "-acme", "acme-", "Acme", "a_b", "x".repeat(41)]) expect(slugOk(slug), slug).toBe(false);
  });

  it("lets owners and maintainers manage", () => {
    expect(canManage("owner")).toBe(true);
    expect(canManage("maintainer")).toBe(true);
    expect(canManage("member")).toBe(false);
  });

  it("lets only owners delete", () => {
    expect(canDelete("owner")).toBe(true);
    expect(canDelete("maintainer")).toBe(false);
  });

  it("turns an organization RPC error into an i18n key", () => {
    expect(orgFailure({ message: "org.slugTaken" })).toEqual({ key: "org.slugTaken" });
    expect(orgFailure({ message: "policy.invalid" })).toEqual({ key: "policy.invalid" });
    expect(orgFailure({ message: "mcp.limit" })).toEqual({ key: "site.org.mcp.limit" });
    expect(orgFailure({ message: "skill.invalid" })).toEqual({ key: "site.org.skill.invalid" });
    expect(orgFailure({ message: "permission denied" })).toBe("permission denied");
  });
});

describe("llm policy", () => {
  it("accepts the empty policy", () => {
    expect(policyOk(emptyPolicy())).toBe(true);
  });

  it("refuses what the database refuses", () => {
    expect(policyProblems({ ...emptyPolicy(), agents: [] })).toEqual(["agents"]);
    expect(policyProblems({ ...emptyPolicy(), blocked_models: ["opus"] })).toEqual(["models"]);
    expect(policyProblems({ ...emptyPolicy(), blocked_models: ["gemini/pro"] })).toEqual(["models"]);
    expect(policyOk({ ...emptyPolicy(), blocked_models: ["claude/claude-opus-4-1", "copilot/gpt-5@latest", "cursor/[auto]"] })).toBe(true);
    expect(policyProblems({ ...emptyPolicy(), deny: ["x".repeat(201)] })).toEqual(["patterns"]);
    expect(policyProblems({ ...emptyPolicy(), local_only: Array.from({ length: 51 }, (_, index) => `d${index}/**`) })).toEqual(["patterns"]);
  });

  it("cleans the lists and orders the agents like the app", () => {
    const payload = policyPayload({ ...emptyPolicy(), agents: ["cursor", "claude"], deny: [" secrets/** ", "", "secrets/**"], blocked_models: ["claude/opus"] });
    expect(payload.agents).toEqual(["claude", "cursor"]);
    expect(payload.deny).toEqual(["secrets/**"]);
    expect(policyPayload(emptyPolicy()).agents).toBeNull();
  });

  it("reads one item per line and fills a stored row with the defaults", () => {
    expect(policyLines("a/**\n\n  b/**  \na/**")).toEqual(["a/**", "b/**"]);
    const stored = storedPolicy({ repository_id: null, agents: ["codex"], deny: ["*.pem"], min_shell: "deny", min_write: "maybe", safe_agents: true });
    expect(stored).toMatchObject({ repositoryId: null, agents: ["codex"], deny: ["*.pem"], blocked_models: [], min_shell: "deny", min_write: "allow", safe_agents: true, redact_secrets: false });
  });
});
