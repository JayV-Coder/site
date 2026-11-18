import { describe, expect, it } from "vitest";
import { doctor } from "@/modules/i18n/messages/doctor";
import { SEGMENTS, segmentValue } from "./segments";

describe("segmentos da Organização", () => {
  it("oferece mais que os três primeiros, com 'Outro' por último", () => {
    expect(SEGMENTS.length).toBeGreaterThan(3);
    expect(SEGMENTS.slice(0, 3)).toEqual(["consulting", "industry", "retail"]);
    expect(SEGMENTS.at(-1)).toBe("other");
  });

  it("cada segmento tem rótulo e um valor gravado único, no tamanho que a API aceita", () => {
    const values = SEGMENTS.map(segmentValue);
    expect(new Set(values).size).toBe(SEGMENTS.length);
    for (const segment of SEGMENTS) {
      expect(doctor).toHaveProperty([`site.doctor.org.segment.${segment}`]);
      expect(segmentValue(segment).length).toBeGreaterThanOrEqual(2);
      expect(segmentValue(segment).length).toBeLessThanOrEqual(80);
    }
  });

  it("os três primeiros continuam gravando o mesmo texto de antes", () => {
    expect(segmentValue("consulting")).toBe("Consultoria de integração");
    expect(segmentValue("industry")).toBe("Indústria");
    expect(segmentValue("retail")).toBe("Varejo");
  });
});

describe("isSegment e segmentOptions", () => {
  it("não aceita nomes herdados de Object.prototype", async () => {
    const { isSegment } = await import("./segments");
    expect(isSegment("toString")).toBe(false);
    expect(isSegment("__proto__")).toBe(false);
    expect(isSegment("health")).toBe(true);
  });

  it("ordena pelo rótulo no idioma de quem vê, com 'Outro' por último", async () => {
    const { segmentOptions } = await import("./segments");
    const labels: Record<string, string> = { consulting: "Integration consulting", industry: "Industry", retail: "Retail", finance: "Financial services", health: "Healthcare", logistics: "Logistics", energy: "Energy", telecom: "Telecommunications", technology: "Technology", public: "Public sector", agribusiness: "Agribusiness", education: "Education", other: "Other" };
    const options = segmentOptions((key) => labels[key.split(".").at(-1) ?? ""] ?? key, "en");
    const names = options.map(({ label }) => label);
    expect(names.at(-1)).toBe("Other");
    expect(names.slice(0, -1)).toEqual([...names.slice(0, -1)].sort((a, b) => a.localeCompare(b, "en")));
    expect(names[0]).toBe("Agribusiness");
  });
});
