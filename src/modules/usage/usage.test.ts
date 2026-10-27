import { describe, expect, it } from "vitest";
import { featureUsageOf, jevCostsOf, modelPricesOf, orgUsageOf, parsePrice, unusedFeatures, usageTotals } from ".";

describe("model prices", () => {
  it("reads the table, sorted, with optional cache prices", () => {
    const prices = modelPricesOf([
      { pattern: "sonnet", input_usd: "3", output_usd: 15, cache_read_usd: null, cache_write_usd: "3.75" },
      { pattern: "gpt-5", input_usd: 1.25, output_usd: 10 },
      { pattern: "", input_usd: 1, output_usd: 1 },
    ]);
    expect(prices.map((price) => price.pattern)).toEqual(["gpt-5", "sonnet"]);
    expect(prices[1]).toEqual({ pattern: "sonnet", inputUsd: 3, outputUsd: 15, cacheReadUsd: null, cacheWriteUsd: 3.75 });
  });

  it("parses the form, accepting a comma and empty cache prices", () => {
    expect(parsePrice({ pattern: " Sonnet ", inputUsd: "3", outputUsd: "15", cacheReadUsd: "0,3", cacheWriteUsd: "" }))
      .toEqual({ pattern: "sonnet", inputUsd: 3, outputUsd: 15, cacheReadUsd: 0.3, cacheWriteUsd: null });
    expect(parsePrice({ pattern: "x", inputUsd: "", outputUsd: "1", cacheReadUsd: "", cacheWriteUsd: "" })).toBeNull();
    expect(parsePrice({ pattern: "x", inputUsd: "-1", outputUsd: "1", cacheReadUsd: "", cacheWriteUsd: "" })).toBeNull();
    expect(parsePrice({ pattern: "x", inputUsd: "1", outputUsd: "1", cacheReadUsd: "abc", cacheWriteUsd: "" })).toBeNull();
  });
});

describe("Jev costs", () => {
  it("keeps a missing cost as null, not zero", () => {
    const costs = jevCostsOf({ days: 30, plans: [{ plan: "free", users: 2, calls: 10, requests: 4, tokens: 900, cost_usd: null, unpriced_calls: 10 }], top: [] });
    expect(costs.plans[0].costUsd).toBeNull();
    expect(costs.plans[0].requests).toBe(4);
    expect(jevCostsOf(null)).toEqual({ days: 30, plans: [], top: [] });
  });
});

describe("feature usage", () => {
  it("lists only measured features nobody used, once someone consented", () => {
    const usage = featureUsageOf({ consenting: 3, features: [
      { feature: "stats", measured: true, uses_60: 5 },
      { feature: "mcp", measured: true, uses_60: 0 },
      { feature: "plans", measured: false, uses_60: 0 },
    ] });
    expect(unusedFeatures(usage).map((item) => item.feature)).toEqual(["mcp"]);
    expect(unusedFeatures({ ...usage, consenting: 0 })).toEqual([]);
  });
});

describe("team usage", () => {
  it("sums the weeks and divides by verified tasks", () => {
    const usage = orgUsageOf({ weeks: 2, series: [
      { week: "2026-10-12", requests: 4, objectives: 2, verified: 1, tokens: 1000, cost_usd: 1 },
      { week: "2026-10-19", requests: 2, objectives: 1, verified: 1, failed: 1, tokens: 3000, cost_usd: "2" },
    ], members: [{ user_id: "a", name: "A", requests: 1, cost_usd: 1 }, { user_id: "b", name: "B", requests: 5, cost_usd: 2 }] });
    const totals = usageTotals(usage);
    expect(totals.turnsPerObjective).toBe(2);
    expect(totals.costPerVerified).toBe(1.5);
    expect(totals.tokensPerVerified).toBe(2000);
    expect(totals.failed).toBe(1);
    expect(usage.members.map((member) => member.userId)).toEqual(["b", "a"]);
    expect(usageTotals(orgUsageOf({})).costPerVerified).toBeNull();
  });
});
