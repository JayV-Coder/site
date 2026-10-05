import { describe, expect, it } from "vitest";
import { adminFailure, blankPlan, CORE_FEATURES, featuresPayload, isFeature, modeOf, withDefault, withMode } from "./catalog";

describe("plans catalog", () => {
  it("knows the features of the app", () => {
    expect(isFeature("organizations")).toBe(true);
    expect(isFeature("somethingNew")).toBe(false);
  });

  it("turns an admin RPC error into an i18n key", () => {
    expect(adminFailure({ message: "admin.error.inUse" })).toEqual({ key: "admin.error.inUse" });
    expect(adminFailure({ message: "permission denied for table plans" })).toBe("permission denied for table plans");
  });

  it("a new plan starts with the core locked", () => {
    const plan = blankPlan(10);
    for (const key of CORE_FEATURES) expect(modeOf(plan, { key, core: true })).toBe("locked");
    expect(plan.maxConcurrentTurns).toBe(1);
    expect(plan.jevDailyLimit).toBeNull();
  });

  it("moves a feature between off, optional and required, but never the core", () => {
    const stats = { key: "stats" as const, core: false };
    let plan = withMode(blankPlan(0), stats, "optional");
    expect(modeOf(plan, stats)).toBe("optional");
    plan = withDefault(plan, "stats", false);
    plan = withMode(plan, stats, "locked");
    expect(plan.features.find((item) => item.key === "stats")).toEqual({ key: "stats", mode: "locked", defaultOn: false });
    plan = withMode(plan, stats, "off");
    expect(modeOf(plan, stats)).toBe("off");
    const core = { key: "secretRedaction" as const, core: true };
    expect(withMode(plan, core, "off")).toBe(plan);
  });

  it("sends the features as the RPC reads them", () => {
    const plan = withDefault(withMode(blankPlan(0), { key: "planFirst" as const, core: false }, "optional"), "planFirst", false);
    expect(featuresPayload(plan)).toContainEqual({ key: "planFirst", mode: "optional", default_on: false });
    expect(featuresPayload(plan)).toContainEqual({ key: "agentSessions", mode: "locked", default_on: true });
  });
});
