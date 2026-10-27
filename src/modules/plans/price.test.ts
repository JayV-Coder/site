import { describe, expect, it } from "vitest";
import { cheapestPaid, formatPlanPrice } from "./price";

describe("plan prices", () => {
  it("formats in the plan's currency and the page's language", () => {
    expect(formatPlanPrice({ isDefault: false, priceCents: 4990, currency: "brl" }, "pt-BR")).toMatch(/^R\$\s?49,90$/);
    expect(formatPlanPrice({ isDefault: true, priceCents: 0, currency: "brl" }, "pt-BR")).toBeNull();
    expect(formatPlanPrice({ isDefault: false, priceCents: null, currency: "brl" }, "en")).toBeNull();
  });

  it("finds the cheapest paid plan", () => {
    const plans = [
      { key: "free", isDefault: true, priceCents: null, currency: null },
      { key: "enterprise", isDefault: false, priceCents: 9990, currency: "brl" },
      { key: "pro", isDefault: false, priceCents: 4990, currency: "brl" },
    ];
    expect(cheapestPaid(plans)?.key).toBe("pro");
    expect(cheapestPaid([plans[0]])).toBeNull();
  });
});
