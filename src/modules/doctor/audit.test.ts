import { describe, expect, it } from "vitest";
import { AUDIT_CATEGORIES, actorOf, auditTone, describeEntry, readCategory } from "./audit";

const entry = (change: Record<string, unknown>) => ({ action: "x", actor_type: "user", actor_label: "ana@acme.com", before: null, after: null, ...change }) as never;

describe("Auditoria", () => {
  it("a categoria do endereço só vale se for conhecida", () => {
    expect(readCategory("security")).toBe("security");
    expect(readCategory("tudo")).toBeNull();
    expect(readCategory(undefined)).toBeNull();
    expect(AUDIT_CATEGORIES).toEqual(["security", "diagnosis", "connectors", "data", "incidents"]);
  });

  it("cada ação conhecida tem o seu texto; a desconhecida aparece como veio", () => {
    expect(describeEntry(entry({ action: "connector.secret.update" }))).toEqual({ key: "site.doctor.audit.action.connector_secret_update" });
    expect(describeEntry(entry({ action: "novo.evento" }))).toEqual({ text: "novo.evento" });
  });

  it("mudança de Papel diz de qual para qual", () => {
    expect(describeEntry(entry({ action: "membership.role_changed", before: { role: "viewer" }, after: { role: "admin" } })))
      .toEqual({ key: "site.doctor.audit.action.role_changed", params: { from: "viewer", to: "admin" } });
  });

  it("revisão de Diagnóstico diz o veredito e a versão", () => {
    expect(describeEntry(entry({ action: "diagnosis.reviewed", after: { verdict: "corrected", version: 3 } })))
      .toEqual({ key: "site.doctor.audit.action.reviewed_corrected", params: { version: 3 } });
    expect(describeEntry(entry({ action: "diagnosis.reviewed", after: {} }))).toEqual({ key: "site.doctor.audit.action.diagnosis_reviewed" });
  });

  it("quem fez: sistema, worker ou a pessoa (removida, se não há mais nome)", () => {
    expect(actorOf(entry({ actor_type: "system" }))).toEqual({ key: "site.doctor.audit.actor.system" });
    expect(actorOf(entry({ actor_type: "worker" }))).toEqual({ key: "site.doctor.audit.actor.worker" });
    expect(actorOf(entry({}))).toEqual({ text: "ana@acme.com" });
    expect(actorOf(entry({ actor_label: null }))).toEqual({ key: "site.doctor.audit.actor.removed" });
  });

  it("acesso e credencial em destaque; revisão humana em verde", () => {
    expect(auditTone("membership.deleted")).toBe("serious");
    expect(auditTone("vault.secret_read")).toBe("serious");
    expect(auditTone("diagnosis.reviewed")).toBe("good");
    expect(auditTone("incident.update")).toBe("neutral");
  });
});
