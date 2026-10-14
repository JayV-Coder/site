import { describe, expect, it } from "vitest";
import { adminFailure, blankPlan, CORE_FEATURES, featuresPayload, isFeature, modeOf, withDefault, withMode, extraPricesPayload, parseCountries } from "./catalog";

describe("plans catalog", () => {
  it("knows the features of the app", () => {
    expect(isFeature("organizations")).toBe(true);
    expect(isFeature("somethingNew")).toBe(false);
  });

  it("turns an admin RPC error into an i18n key", () => {
    expect(adminFailure({ message: "admin.error.inUse" })).toEqual({ key: "admin.error.inUse" });
    expect(adminFailure({ message: "permission denied for table plans" })).toBe("permission denied for table plans");
  });

  it("a new plan starts with the core locked, as a starting point", () => {
    const plan = blankPlan(10);
    for (const key of CORE_FEATURES) expect(modeOf(plan, { key })).toBe("locked");
    expect(plan.maxConcurrentTurns).toBe(1);
    expect(plan.jevDailyLimit).toBeNull();
  });

  it("moves any feature between off, optional and required, the core included", () => {
    const stats = { key: "stats" as const };
    let plan = withMode(blankPlan(0), stats, "optional");
    expect(modeOf(plan, stats)).toBe("optional");
    plan = withDefault(plan, "stats", false);
    plan = withMode(plan, stats, "locked");
    expect(plan.features.find((item) => item.key === "stats")).toEqual({ key: "stats", mode: "locked", defaultOn: false });
    plan = withMode(plan, stats, "off");
    expect(modeOf(plan, stats)).toBe("off");
    const core = { key: "secretRedaction" as const };
    plan = withMode(blankPlan(0), core, "off");
    expect(modeOf(plan, core)).toBe("off");
    expect(plan.features.some((item) => item.key === "secretRedaction")).toBe(false);
  });

  it("sends the features as the RPC reads them", () => {
    const plan = withDefault(withMode(blankPlan(0), { key: "planFirst" as const }, "optional"), "planFirst", false);
    expect(featuresPayload(plan)).toContainEqual({ key: "planFirst", mode: "optional", default_on: false });
    expect(featuresPayload(plan)).toContainEqual({ key: "agentSessions", mode: "locked", default_on: true });
  });
});

describe("preços em outras moedas", () => {
  it("lê os países digitados, em maiúsculas e sem repetir", () => {
    expect(parseCountries("us, ca;  US  br")).toEqual(["US", "CA", "BR"]);
    expect(parseCountries("")).toEqual([]);
  });

  it("manda ao banco só as moedas com valor", () => {
    const plan = { extraPrices: [{ currency: "usd", priceCents: 990, countries: ["US"] }, { currency: "eur", priceCents: null, countries: [] }] };
    expect(extraPricesPayload(plan)).toEqual([{ currency: "usd", price_cents: 990, countries: ["US"] }]);
  });
});
