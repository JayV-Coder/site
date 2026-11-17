import { describe, expect, it } from "vitest";
import {
  applicationServerKey, deliveryState, EMPTY_RULE, eventKey, quietHours, ruleChannelKinds, ruleConditions, ruleWhen, toQuiet, webhookState,
} from "./alerts";

const words = { environment: (v: string) => v.toUpperCase(), allEnvironments: "all", allIntegrations: "every", integration: "Integration", severity: (v: string) => v };

describe("regras de alerta", () => {
  it("as condições levam só o que o tipo usa", () => {
    expect(ruleConditions({ ...EMPTY_RULE, environments: ["prd"] })).toEqual({ type: "incident", min_severity: "critical", environments: ["prd"] });
    expect(ruleConditions({ ...EMPTY_RULE, type: "error_rate", threshold: "12", minutes: "" })).toEqual({ type: "error_rate", threshold_pct: 12, minutes: 10 });
    expect(ruleConditions({ ...EMPTY_RULE, type: "diagnosis_review", minutes: "" })).toEqual({ type: "diagnosis_review", minutes: 30 });
    expect(ruleConditions({ ...EMPTY_RULE, type: "connector_failing" })).toEqual({ type: "connector_failing" });
  });

  it("severidade desconhecida cai em alta, não vai à API", () => {
    expect(ruleConditions({ ...EMPTY_RULE, severity: "constructor" })).toMatchObject({ min_severity: "high" });
  });

  it("o silêncio precisa dos dois horários", () => {
    expect(quietHours("22:00", "")).toBeNull();
    expect(quietHours("22:00", "06:00")).toMatchObject({ start: "22:00", end: "06:00" });
    expect(toQuiet({ start: "22:00", end: 6 })).toBeNull();
    expect(toQuiet({ start: "22:00", end: "06:00", timezone: "x" })).toEqual({ start: "22:00", end: "06:00" });
  });

  it("descreve o quando de cada tipo", () => {
    const integrations = [{ id: "a", name: "Pedidos" }];
    expect(ruleWhen({ type: "incident", min_severity: "high", environments: ["prd", "hml"] }, integrations, words).params).toEqual({ severity: "high", environments: "PRD, HML" });
    expect(ruleWhen({ type: "incident", min_severity: "high", environments: [] }, integrations, words).params?.environments).toBe("all");
    expect(ruleWhen({ type: "error_rate", threshold_pct: 5, minutes: 10, integrations: ["a", "zz"] }, integrations, words).params?.scope).toBe("Pedidos, Integration");
    expect(ruleWhen({ type: "error_rate", threshold_pct: 5, minutes: 10 }, integrations, words).params?.scope).toBe("every");
    expect(ruleWhen({ type: "connector_failing" }, integrations, words).key).toBe("site.doctor.alerts.when.connector");
    expect(ruleWhen({ type: "diagnosis_review", minutes: 30 }, integrations, words).params).toEqual({ minutes: "30" });
  });

  it("lista os canais sem repetir, na ordem fixa", () => {
    const channels = [{ id: "1", type: "slack" }, { id: "2", type: "webpush" }, { id: "3", type: "slack" }];
    expect(ruleChannelKinds(["1", "3", "2", "gone"], channels)).toEqual(["webpush", "slack"]);
    expect(ruleChannelKinds([], channels)).toEqual([]);
  });

  it("converte a chave VAPID de base64url em bytes", () => {
    expect([...applicationServerKey("AQID")]).toEqual([1, 2, 3]);
    expect([...applicationServerKey("-_8")]).toEqual([251, 255]);
  });
});

describe("webhooks na tela", () => {
  it("estado do webhook", () => {
    expect(webhookState({ enabled: true, failure_count: 0 }).key).toBe("site.doctor.webhooks.state.active");
    expect(webhookState({ enabled: true, failure_count: 3 })).toMatchObject({ key: "site.doctor.webhooks.state.failing", params: { count: 3 } });
    expect(webhookState({ enabled: false, failure_count: 50 }).key).toBe("site.doctor.webhooks.state.off");
  });

  it("estado da entrega", () => {
    expect(deliveryState({ status: "succeeded", response_status: 200 }).params).toEqual({ http: "HTTP 200" });
    expect(deliveryState({ status: "pending", response_status: 503 }).key).toBe("site.doctor.webhooks.delivery.retrying");
    expect(deliveryState({ status: "pending", response_status: null }).key).toBe("site.doctor.webhooks.delivery.queued");
    expect(deliveryState({ status: "abandoned", response_status: null }).key).toBe("site.doctor.webhooks.delivery.abandoned");
    expect(deliveryState({ status: "failed", response_status: null }).key).toBe("site.doctor.webhooks.delivery.failed");
  });

  it("evento desconhecido não vira chave de texto", () => {
    expect(eventKey("incident.opened")).toBe("site.doctor.webhooks.event.incident.opened");
    expect(eventKey("constructor")).toBeNull();
  });
});
