import { describe, expect, it } from "vitest";
import {
  correlationKey, crossKeysText, errorSummary, eventSource, filtersHref, highlightJson, laneOf, lanes, readExecutionFilters,
  sanitizationItems, toExecutionSearch,
} from "./executions";

const UUID = "0b5a6c1e-1f2d-4c3b-9a8e-7d6c5b4a3f21";

describe("Execuções e Eventos", () => {
  it("lê do endereço só filtros conhecidos; o termo de busca nunca vem dali", () => {
    expect(readExecutionFilters({ status: "failed", integration: UUID, environment: "prd", period: "24h", q: "4500012345" }))
      .toEqual({ status: "failed", integration: UUID, environment: "prd", period: "24h" });
    expect(readExecutionFilters({ status: "xyz", integration: "not-a-uuid", environment: ["prd"], period: "1y" })).toEqual({});
  });

  it("o período vira o início da busca, contado do instante da primeira página", () => {
    const now = new Date("2026-11-16T12:00:00Z");
    expect(toExecutionSearch({ status: "failed", period: "24h" }, now))
      .toEqual({ status: "failed", integration_id: null, environment: null, from: "2026-11-15T12:00:00.000Z", limit: 25 });
    expect(toExecutionSearch({}, now).from).toBeNull();
  });

  it("o link de um filtro rápido liga ou desliga só ele", () => {
    const filters = { status: "failed", environment: "prd" };
    expect(filtersHref("/pt-BR/doctor/executions", filters, "status", "failed")).toBe("/pt-BR/doctor/executions?environment=prd");
    expect(filtersHref("/pt-BR/doctor/executions", filters, "period", "24h")).toBe("/pt-BR/doctor/executions?status=failed&environment=prd&period=24h");
    expect(filtersHref("/x", {}, "status", "failed")).toBe("/x?status=failed");
    expect(filtersHref("/x", { status: "failed" }, "status", "failed")).toBe("/x");
  });

  it("as raias seguem o fluxo típico (origem, middleware, destino); sistemas novos vão ao fim", () => {
    const events = [{ source: { provider: "sap" } }, { source: { provider: "salesforce" } }, { source: { provider: "zeta" } }, { source: {} }];
    expect(lanes(events).map((lane) => lane.system)).toEqual(["salesforce", "sap", "custom", "zeta"]);
    expect(laneOf({ source: {} })).toBe("custom");
    expect(lanes([{ source: { provider: "manual" } }])[0]).toEqual({ system: "manual", key: "site.doctor.lane.manual", short: "Imp" });
  });

  it("a chave entre sistemas mostra só os valores, sem repetir", () => {
    expect(crossKeysText(["m1:4500012345", "m2:4500012345", "m1:OV-9"])).toBe("4500012345, OV-9");
  });

  it("como o Evento entrou na Execução", () => {
    expect(correlationKey("trace_id")).toBe("site.doctor.correlation.trace_id");
    expect(correlationKey(null)).toBe("site.doctor.correlation.none");
    expect(correlationKey("novo")).toBe("site.doctor.correlation.other");
  });

  it("de onde o Evento veio e o resumo do erro", () => {
    expect(eventSource({ service: "sap-order-sync", provider: "sap" })).toBe("sap-order-sync");
    expect(eventSource({ provider: "sap" })).toBe("sap");
    expect(eventSource({})).toBeNull();
    expect(errorSummary({ http_status: 504, category: "TIMEOUT" })).toBe("HTTP 504 TIMEOUT");
    expect(errorSummary({ message: "x" })).toBeNull();
    expect(errorSummary(null)).toBeNull();
  });

  it("a Sanitização: cada tipo removido com a contagem, Referências à parte, e o truncamento", () => {
    expect(sanitizationItems({ counts: { cpf: 2, email: 1, referencia: 3, matricula: 1, ip: 0 }, truncated: true })).toEqual({
      items: [{ key: "site.doctor.sanitized.cpf", count: 2 }, { key: "site.doctor.sanitized.email", count: 1 }, { key: "site.doctor.sanitized.custom", count: 1, kind: "matricula" }],
      references: 3, truncated: true,
    });
    expect(sanitizationItems(null)).toEqual({ items: [], references: 0, truncated: false });
  });

  it("realça o JSON e marca o que a Sanitização trocou", () => {
    const tokens = highlightJson({ id: 7, ok: true, cpf: "[REMOVIDO:cpf]", nome: "x" });
    expect(tokens.filter((token) => token.kind === "key").map((token) => token.text)).toEqual(['"id"', '"ok"', '"cpf"', '"nome"']);
    expect(tokens.find((token) => token.kind === "redacted")?.text).toBe('"[REMOVIDO:cpf]"');
    // A marca no meio de uma mensagem também conta.
    expect(highlightJson({ message: "bloqueado por [REMOVIDO:matricula]" }).some((token) => token.kind === "redacted")).toBe(true);
    expect(tokens.find((token) => token.kind === "number")?.text).toBe("7");
    expect(tokens.find((token) => token.kind === "literal")?.text).toBe("true");
    expect(tokens.map((token) => token.text).join("")).toBe(JSON.stringify({ id: 7, ok: true, cpf: "[REMOVIDO:cpf]", nome: "x" }, null, 2));
  });
});
