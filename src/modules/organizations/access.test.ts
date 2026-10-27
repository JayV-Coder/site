import { describe, expect, it } from "vitest";
import { accessOf, memberPlansOf, type AccessInput } from "./access";
import { emptyPolicy } from "./policy";

const base: AccessInput = {
  role: "member",
  plan: { userId: "u", role: "member", admin: false, plan: "free", planName: "Free", features: ["stats"], jevDailyRequests: 20 },
  off: ["mcp"],
  policies: [],
  commandRules: [],
  chatBlocked: [],
  chatEnabled: [],
  validation: { required: false, holdCommits: false },
};

const line = (input: AccessInput, id: string) => accessOf(input).flatMap((area) => area.lines).find((item) => item.id === id);

describe("what a member can do", () => {
  it("explains plan features by the rule that decides", () => {
    expect(line(base, "plan-stats")).toMatchObject({ state: "allowed", reason: "site.access.reason.inPlan" });
    expect(line(base, "plan-mcp")).toMatchObject({ state: "blocked", reason: "site.access.reason.featureOff" });
    expect(line(base, "plan-orgChat")).toMatchObject({ state: "blocked", reason: "site.access.reason.notInPlan", reasonParams: { plan: "Free" } });
    const admin = { ...base, plan: { ...base.plan!, admin: true } };
    expect(line(admin, "plan-mcp")).toMatchObject({ state: "allowed", reason: "site.access.reason.systemAdmin" });
  });

  it("reads the role", () => {
    expect(line(base, "role-invite")?.state).toBe("blocked");
    expect(line({ ...base, role: "owner" }, "role-delete")?.state).toBe("allowed");
  });

  it("applies the organization's LLM policy", () => {
    const policy = { ...emptyPolicy(), agents: ["claude" as const], blocked_models: ["claude/opus"], min_shell: "deny" as const, repositoryId: null, updatedAt: "" };
    const input = { ...base, policies: [policy, { ...policy, repositoryId: "r1" }] };
    expect(line(input, "agent-codex")).toMatchObject({ state: "blocked", reason: "site.access.reason.agentOff" });
    expect(line(input, "agent-claude")).toMatchObject({ state: "limited", reasonParams: { models: 1, mechanisms: 0 } });
    expect(line(input, "rule-shell")).toMatchObject({ state: "blocked", reason: "site.access.reason.rule.deny" });
    expect(line(input, "repo-policies")?.params).toEqual({ count: 1 });
    expect(line(base, "agent-codex")?.reason).toBe("site.access.reason.noPolicy");
  });

  it("covers chat permissions, commands and validation", () => {
    const input = { ...base, chatBlocked: ["git" as const], chatEnabled: ["shell" as const], commandRules: [{ repositoryId: null, blocked: ["git push"] }], validation: { required: true, holdCommits: true } };
    expect(line(input, "chat-git")?.state).toBe("blocked");
    expect(line(input, "chat-shell")?.state).toBe("required");
    expect(line(input, "command-git push")?.state).toBe("blocked");
    expect(line(input, "validation-required")?.state).toBe("required");
    expect(line(input, "validation-hold")?.state).toBe("limited");
    expect(line(base, "commands-none")?.state).toBe("allowed");
  });

  it("parses member plans", () => {
    const plans = memberPlansOf({ off: ["mcp"], members: [{ user_id: "u", role: "member", plan: "free", plan_name: "Free", features: ["stats"], jev_daily_requests: 20 }, { role: "x" }] });
    expect(plans.members).toHaveLength(1);
    expect(plans.off).toEqual(["mcp"]);
  });
});
