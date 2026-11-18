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
