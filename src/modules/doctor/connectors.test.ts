import { describe, expect, it } from "vitest";
import {
  buildSalesforceCredential, checkpointInstant, connectorState, INTERVALS, intervalParts, intervalOptions, pauseKey, relativeParts,
  serviceAccountEmail, syncSeconds, syncStatus,
} from "./connectors";

const NOW = new Date("2026-11-16T14:32:00Z");

describe("Conectores", () => {
  it("o estado: com falhas, pausado e desativado pelo status; ativo é saudável depois da primeira coleta", () => {
    expect(connectorState({ status: "failing", last_sync_at: null })).toEqual({ key: "site.doctor.connector.state.failing", variant: "warning" });
    expect(connectorState({ status: "paused", last_sync_at: null })).toEqual({ key: "site.doctor.connector.state.paused", variant: "secondary" });
    expect(connectorState({ status: "disabled", last_sync_at: null })).toEqual({ key: "site.doctor.connector.state.disabled", variant: "destructive" });
    expect(connectorState({ status: "active", last_sync_at: "2026-11-16T14:30:00Z" })).toEqual({ key: "site.doctor.connector.state.healthy", variant: "success" });
    expect(connectorState({ status: "active", last_sync_at: null })).toEqual({ key: "site.doctor.connector.state.waiting", variant: "outline" });
  });

  it("tempo relativo nos dois sentidos, na maior unidade que cabe", () => {
    expect(relativeParts("2026-11-16T14:31:40Z", NOW)).toEqual({ unit: "now" });
    expect(relativeParts("2026-11-16T14:20:00Z", NOW)).toEqual({ unit: "minutes", count: -12 });
    expect(relativeParts("2026-11-16T10:00:00Z", NOW)).toEqual({ unit: "hours", count: -4 });
    expect(relativeParts("2026-11-13T14:32:00Z", NOW)).toEqual({ unit: "days", count: -3 });
    expect(relativeParts("2026-11-16T14:47:00Z", NOW)).toEqual({ unit: "minutes", count: 15 });
    expect(relativeParts("2026-11-16T17:40:00Z", NOW)).toEqual({ unit: "hours", count: 3 });
  });

  it("o Checkpoint: o instante do provedor; no Salesforce, o mais recente das fontes", () => {
    expect(checkpointInstant(null)).toBeNull();
    expect(checkpointInstant({ timestamp: "2026-11-16T14:00:00Z" })).toBe("2026-11-16T14:00:00Z");
    expect(checkpointInstant({ sources: { a: { at: "2026-11-16T10:00:00Z" }, b: { at: "2026-11-16T12:00:00Z" } } })).toBe("2026-11-16T12:00:00Z");
    expect(checkpointInstant({ page_token: "x" })).toBe("saved");
  });

  it("o motivo da pausa", () => {
    expect(pauseKey("auth")).toBe("site.doctor.connector.pause.auth");
    expect(pauseKey("api_limit")).toBe("site.doctor.connector.pause.apiLimit");
    expect(pauseKey(null)).toBe("site.doctor.connector.pause.manual");
  });

  it("intervalo em minutos ou horas; o salvo fora da lista entra nas opções", () => {
    expect(intervalParts(300)).toEqual({ unit: "minutes", count: 5 });
    expect(intervalParts(7200)).toEqual({ unit: "hours", count: 2 });
    expect(intervalOptions(900)).toEqual([...INTERVALS]);
    expect(intervalOptions(120)).toEqual([...INTERVALS, 120]);
  });

  it("a Sincronização: duração em segundos (nula enquanto roda) e o selo do status", () => {
    expect(syncSeconds("2026-11-16T14:00:00Z", null)).toBeNull();
    expect(syncSeconds("2026-11-16T14:00:00Z", "2026-11-16T14:02:05Z")).toBe(125);
    expect(syncStatus("succeeded")).toEqual({ key: "site.doctor.sync.succeeded", variant: "success" });
    expect(syncStatus("failed")).toEqual({ key: "site.doctor.sync.failed", variant: "destructive" });
    expect(syncStatus("running")).toEqual({ key: "site.doctor.sync.running", variant: "outline" });
    expect(syncStatus("novo")).toEqual({ text: "novo", variant: "secondary" });
  });

  it("a chave do Google só passa se for de Service Account", () => {
    expect(serviceAccountEmail(JSON.stringify({ type: "service_account", client_email: "x@p.iam.gserviceaccount.com", private_key: "k" }))).toBe("x@p.iam.gserviceaccount.com");
    expect(serviceAccountEmail(JSON.stringify({ type: "authorized_user" }))).toBeNull();
    expect(serviceAccountEmail("não é json")).toBeNull();
  });

  it("a credencial do Salesforce só sai completa, pelo modo escolhido", () => {
    const fields = { client_id: " id ", username: "int@acme.com", private_key: "-----BEGIN PRIVATE KEY-----x", client_secret: "", refresh_token: "" };
    expect(buildSalesforceCredential("jwt_bearer", fields)).toBe(JSON.stringify({ client_id: "id", username: "int@acme.com", private_key: "-----BEGIN PRIVATE KEY-----x" }));
    expect(buildSalesforceCredential("web_server", fields)).toBeNull();
    expect(buildSalesforceCredential("web_server", { ...fields, client_secret: "s", refresh_token: "r" })).toBe(JSON.stringify({ client_id: "id", client_secret: "s", refresh_token: "r" }));
  });
});
