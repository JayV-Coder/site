import { describe, expect, it } from "vitest";
import { parseMyOverview, parseSystemOverview, peak, periodOf, personName, viewOf } from "./index";

describe("periodOf", () => {
  it("accepts the offered periods and falls back to 30 days", () => {
    expect(periodOf("7")).toBe(7);
    expect(periodOf(["90"])).toBe(90);
    expect(periodOf("365")).toBe(30);
    expect(periodOf(undefined)).toBe(30);
  });
});

describe("viewOf", () => {
  it("opens the admin on the system and everyone else on their own usage", () => {
    expect(viewOf(undefined, true)).toBe("system");
    expect(viewOf("me", true)).toBe("me");
    expect(viewOf("system", false)).toBe("me");
  });
});

describe("parseMyOverview", () => {
  it("turns numbers sent as text into numbers and keeps an unlimited Jev as null", () => {
    const overview = parseMyOverview({
      days: 30, zone: "America/Recife", from: "2026-09-10",
      usage: { calls: "117", cost_usd: "12.5", input_tokens: 10 },
      jev: { today: 3, limit: null },
      daily: [{ day: "2026-10-09", requests: "2", tokens: 10, cost_usd: 0.1 }],
      environments: [{ id: "personal", name: null, requests: 1 }],
    });
    expect(overview.usage.calls).toBe(117);
    expect(overview.usage.costUsd).toBe(12.5);
    expect(overview.jev).toEqual({ today: 3, limit: null });
    expect(overview.daily[0]).toEqual({ day: "2026-10-09", requests: 2, tokens: 10, costUsd: 0.1 });
    expect(overview.environments[0].name).toBeNull();
    expect(overview.models).toEqual([]);
  });

  it("survives an empty answer", () => {
    const overview = parseMyOverview(null);
    expect(overview.zone).toBe("UTC");
    expect(overview.totals.projects).toBe(0);
    expect(overview.recentChats).toEqual([]);
  });
});

describe("parseSystemOverview", () => {
  it("reads accounts, access and the busiest users", () => {
    const overview = parseSystemOverview({
      users: { total: 6, new: 2, signed_in_week: 5 },
      access: { sessions: 12, open_sessions: 10, active_period: 5 },
      top_users: [{ user_id: "u1", username: "ana", requests: 9, cost_usd: "1.5" }],
      plans: [{ key: "free", name: "Free", users: 6 }],
    });
    expect(overview.users).toMatchObject({ total: 6, new: 2, signedInWeek: 5 });
    expect(overview.access).toMatchObject({ sessions: 12, openSessions: 10, activePeriod: 5 });
    expect(overview.topUsers[0]).toMatchObject({ userId: "u1", username: "ana", requests: 9, costUsd: 1.5 });
    expect(overview.plans).toEqual([{ key: "free", name: "Free", users: 6 }]);
  });
});

describe("helpers", () => {
  it("never scales a chart by zero", () => {
    expect(peak([0, 0])).toBe(1);
    expect(peak([2, 8, 3])).toBe(8);
  });

  it("names an account by its display name, username or e-mail", () => {
    expect(personName({ displayName: "Ana", username: "ana", email: "a@x.test" })).toBe("Ana");
    expect(personName({ displayName: null, username: "ana", email: "a@x.test" })).toBe("@ana");
    expect(personName({ displayName: null, username: null, email: "a@x.test" })).toBe("a@x.test");
  });
});
