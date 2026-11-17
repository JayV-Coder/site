import { describe, expect, it } from "vitest";
import { dpaKey, subprocessors } from "./privacy";
import { amountText, meterTone, percentOf, planKey, quotaWarning, resourceKey } from "./usage";

describe("uso e cotas", () => {
  it("a barra fica entre 0 e 100", () => {
    expect(percentOf(0.456)).toBe(46);
    expect(percentOf(1.4)).toBe(100);
    expect(percentOf(-1)).toBe(0);
  });

  it("o tom muda aos 80% e aos 100%", () => {
    expect(meterTone(0.79)).toBe("ok");
    expect(meterTone(0.8)).toBe("warning");
    expect(meterTone(1)).toBe("danger");
  });

  it("avisa aos 80% e na Cota esgotada, com o efeito de cada recurso", () => {
    expect(quotaWarning("members", 0.5)).toBeNull();
    expect(quotaWarning("members", 0.85)).toEqual({ key: "site.doctor.usage.warn.percent", params: { percent: 85 } });
    expect(quotaWarning("diagnoses_llm", 0.9)?.key).toBe("site.doctor.usage.warn.percentLlm");
    expect(quotaWarning("diagnoses_llm", 1)?.key).toBe("site.doctor.usage.warn.llmExhausted");
    expect(quotaWarning("events_ingested", 1, 1.1)).toEqual({ key: "site.doctor.usage.warn.eventsExhausted", params: { percent: 110 } });
    expect(quotaWarning("storage_bytes", 1)?.key).toBe("site.doctor.usage.warn.storage");
    expect(quotaWarning("members", 1)?.key).toBe("site.doctor.usage.warn.limit");
  });

  it("quantidades curtas no idioma, e armazenamento em GB", () => {
    expect(amountText("en", "events_ingested", 1_500_000)).toBe("1.5M");
    expect(amountText("en", "members", 8)).toBe("8");
    expect(amountText("en", "storage_bytes", 2_500_000_000)).toBe("2.5 GB");
  });

  it("recurso ou plano desconhecido não vira chave de texto", () => {
    expect(resourceKey("members")).toBe("site.doctor.usage.resource.members");
    expect(resourceKey("constructor")).toBeNull();
    expect(planKey("pilot")).toBe("site.doctor.usage.plan.pilot");
    expect(planKey("toString")).toBeNull();
  });
});

describe("subprocessadores por perfil de IA", () => {
  it("o padrão leva Anthropic e Voyage; o Brasil, o Vertex; o local, nenhum de IA", () => {
    expect(subprocessors("standard").map((item) => item.name)).toEqual(["Supabase", "Google Cloud", "Anthropic", "Voyage AI"]);
    expect(subprocessors("br_region").map((item) => item.name)).toEqual(["Supabase", "Google Cloud", "Google Vertex AI"]);
    expect(subprocessors("dedicated")[2]?.purpose).toBe("site.doctor.subprocessors.purpose.vertexDedicated");
    expect(subprocessors("local").map((item) => item.name)).toEqual(["Supabase", "Google Cloud"]);
  });

  it("o DPA segue o perfil", () => {
    expect(dpaKey("local")).toBe("site.doctor.subprocessors.dpa.local");
    expect(dpaKey("standard")).toBe("site.doctor.subprocessors.dpa.standard");
    expect(dpaKey("dedicated")).toBe("site.doctor.subprocessors.dpa.brazil");
  });
});
