import { describe, expect, it } from "vitest";
import { defaultRows, environmentVariant, integrationChange, integrationFields, keyParts, keysFromRows, lookupFromDraft, type KeyRow } from "./integrations";

const row = (change: Partial<KeyRow>): KeyRow => ({ system: "sap", field: "", prefix: "", zeros: false, upper: false, ...change });

describe("Integrações e Mapas entre sistemas", () => {
  it("o selo do Ambiente: Produção em destaque", () => {
    expect(environmentVariant("prd")).toBe("destructive");
    expect(environmentVariant("hml")).toBe("secondary");
    expect(environmentVariant("dev")).toBe("outline");
  });

  it("as linhas do Mapa começam na ordem do fluxo: origem, middleware, destino", () => {
    expect(defaultRows("salesforce", "sap").map((item) => item.system)).toEqual(["salesforce", "gcp", "sap"]);
    // "Outro" na Integração vira "Outro" do Mapa.
    expect(defaultRows("other", "sap")[0]?.system).toBe("custom");
  });

  it("cada linha preenchida vira uma chave; aparar sempre, e o resto só se pedido", () => {
    expect(keysFromRows([
      row({ system: "salesforce", field: " attributes.bstkd ", prefix: "sf-", upper: true }),
      row({ field: "" }),
      row({ field: "execution_id", zeros: true }),
    ])).toEqual([
      // Com maiúsculas, o prefixo também vai em maiúsculas e depois delas: "sf-801" vira "801".
      { system: "salesforce", field: "attributes.bstkd", transforms: [{ op: "trim" }, { op: "upper" }, { op: "strip_prefix", value: "SF-" }] },
      { system: "sap", field: "execution_id", transforms: [{ op: "trim" }, { op: "strip_leading_zeros" }] },
    ]);
  });

  it("a consulta no destino só vai com Conector; campos opcionais vazios vão nulos", () => {
    expect(lookupFromDraft({ connector: "", entity: "A_SalesOrder", field: "x", statusField: "", idField: "", pad: "0" })).toBeNull();
    expect(lookupFromDraft({ connector: "c1", entity: " A_SalesOrder ", field: "PurchaseOrderByCustomer", statusField: "", idField: "SalesOrder", pad: "10" }))
      .toEqual({ connector_id: "c1", entity: "A_SalesOrder", field: "PurchaseOrderByCustomer", status_field: null, id_field: "SalesOrder", pad_left: 10 });
  });

  it("o resumo de uma chave: sistema, campo e os passos conhecidos", () => {
    expect(keyParts({ system: "sap", field: "attributes.bstkd", transforms: [{ op: "trim" }, { op: "strip_prefix", value: "SF-" }, { op: "upper" }, { op: "novo" }] }))
      .toEqual({ system: { name: "SAP" }, field: "attributes.bstkd", steps: [{ key: "site.doctor.mapping.step.strip_prefix", value: "SF-" }, { key: "site.doctor.mapping.step.upper" }] });
    expect(keyParts({ system: "custom", field: "x" }).system).toEqual({ key: "site.doctor.lane.custom" });
    // Os nomes vêm da mesma lista das raias da Timeline.
    expect(keyParts({ system: "manual", field: "x" }).system).toEqual({ key: "site.doctor.lane.manual" });
  });
});

describe("integrationFields", () => {
  const draft = { name: "  Pedidos  ", source_system: "sap", target_system: "salesforce", environment: "prd", owner_team: " Time A ", description: "" };

  it("todos os campos, aparados; opcional vazio vai como null", () => {
    expect(integrationFields(draft)).toEqual({
      name: "Pedidos", source_system: "sap", target_system: "salesforce", environment: "prd", owner_team: "Time A", description: null,
    });
    expect(integrationFields({ ...draft, owner_team: "   " }).owner_team).toBeNull();
  });
});

describe("integrationChange", () => {
  const initial = { name: "Pedidos", source_system: "sap", target_system: "salesforce", environment: "prd", owner_team: "Time A", description: "" };

  it("só o que mudou: a edição de outra pessoa nos outros campos não é desfeita", () => {
    expect(integrationChange({ ...initial, description: "Fluxo de pedidos" }, initial)).toEqual({ description: "Fluxo de pedidos" });
  });

  it("limpar um opcional manda null", () => {
    expect(integrationChange({ ...initial, owner_team: "" }, initial)).toEqual({ owner_team: null });
  });

  it("espaço a mais não conta como mudança; nada mudou, nada vai", () => {
    expect(integrationChange({ ...initial, name: " Pedidos " }, initial)).toEqual({});
  });
});
