import { describe as suite, expect, it } from "vitest";
import { describe, fromRow, newestFirst, targetOf, timeAgo, toneOf } from "./rules";

const row = (kind: string, data: unknown = {}) => ({ id: "n1", kind, data, created_at: "2026-10-08T12:00:00Z", read_at: null });

suite("account notifications", () => {
  it("reads the rows the app reads and skips kinds it does not know", () => {
    expect(fromRow(row("org.invited", { org: "Acme" }))).toMatchObject({ kind: "org.invited", read: false, data: { org: "Acme" } });
    expect(fromRow({ ...row("org.removed"), read_at: "2026-10-08T13:00:00Z" })?.read).toBe(true);
    expect(fromRow(row("turn.answered"))).toBeNull();
    expect(fromRow(row("org.invited", null))?.data).toEqual({});
  });

  it("names the app's phrase and who did it", () => {
    const invited = fromRow(row("org.invited", { org: "Acme", role: "member", user: "ana" }))!;
    expect(describe(invited)).toMatchObject({ title: "notifications.org.invited", byKey: "notifications.by", by: "@ana", params: { org: "Acme", role: "member" } });
    expect(describe(fromRow(row("org.inviteAccepted", { user: "ana" }))!).byKey).toBeNull();
    expect(describe(fromRow(row("org.removed", {}))!).byKey).toBeNull();
    expect(describe(fromRow(row("org.policyChanged", { repository: "a/b" }))!).title).toBe("notifications.org.repositoryPolicyChanged");
    expect(describe(fromRow(row("org.policyChanged", {}))!).title).toBe("notifications.org.policyChanged");
  });

  it("points at the organization, or nowhere once it is gone", () => {
    expect(targetOf(fromRow(row("org.roleChanged", { orgId: "o1" }))!)).toBe("/dashboard/organizations/o1");
    expect(targetOf(fromRow(row("org.invited", { orgId: "o1" }))!)).toBe("/dashboard/organizations");
    expect(targetOf(fromRow(row("org.removed", { orgId: "o1" }))!)).toBeNull();
    expect(targetOf(fromRow(row("org.policyChanged"))!)).toBeNull();
  });

  it("colors by the app's traffic light", () => {
    expect(toneOf("org.invited")).toBe("ask");
    expect(toneOf("org.inviteAccepted")).toBe("go");
    expect(toneOf("org.deleted")).toBe("stop");
    expect(toneOf("org.policyChanged")).toBe("info");
  });

  it("sorts newest first and says how long ago", () => {
    const a = { ...fromRow(row("org.removed"))!, id: "a", createdAt: "2026-10-08T10:00:00Z" };
    const b = { ...fromRow(row("org.removed"))!, id: "b", createdAt: "2026-10-08T11:00:00Z" };
    expect(newestFirst([a, b]).map((item) => item.id)).toEqual(["b", "a"]);
    const now = Date.parse("2026-10-08T12:00:00Z");
    expect(timeAgo("2026-10-08T11:55:00Z", "en", now)).toContain("5");
  });
});
