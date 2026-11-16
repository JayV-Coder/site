import { describe, expect, it } from "vitest";
import { fieldsText, jiraState, normalizeInstance, parseFields, serviceNowState, validInstance, validProjectKey } from "./itsm";

describe("Chamados (ITSM)", () => {
  it("o estado do Jira: sem conexão, conectar de novo, falta o projeto, conectado", () => {
    expect(jiraState(null)).toEqual({ key: "site.doctor.itsm.state.none", variant: "secondary" });
    expect(jiraState({ status: "needs_reauth", project_key: "SUST" })).toEqual({ key: "site.doctor.itsm.state.reauth", variant: "destructive" });
    expect(jiraState({ status: "pending", project_key: null })).toEqual({ key: "site.doctor.itsm.state.noProject", variant: "warning" });
    expect(jiraState({ status: "active", project_key: "SUST" })).toEqual({ key: "site.doctor.itsm.state.connected", variant: "success" });
  });

  it("o estado do ServiceNow", () => {
    expect(serviceNowState(null)).toEqual({ key: "site.doctor.itsm.state.none", variant: "secondary" });
    expect(serviceNowState({ status: "needs_reauth" })).toEqual({ key: "site.doctor.itsm.state.credentials", variant: "destructive" });
    expect(serviceNowState({ status: "active" })).toEqual({ key: "site.doctor.itsm.state.connected", variant: "success" });
    // Salva, mas ainda não conferida: não é "Conectado".
    expect(serviceNowState({ status: "pending" })).toEqual({ key: "site.doctor.itsm.state.unverified", variant: "warning" });
  });

  it("campos fixos do Jira: um por linha, customfield_<número>=valor", () => {
    expect(parseFields("customfield_10010=Sustentação\n\n customfield_2 = SAP ")).toEqual({ ok: true, fields: { customfield_10010: "Sustentação", customfield_2: "SAP" } });
    expect(parseFields("summary=x")).toEqual({ ok: false, line: 1 });
    expect(fieldsText({ customfield_1: "a", customfield_2: 3 })).toBe("customfield_1=a\ncustomfield_2=3");
    // O tipo que já estava (número, verdadeiro/falso) volta igual se o texto não mudou.
    expect(parseFields("customfield_2=5\ncustomfield_3=true\ncustomfield_4=7", { customfield_2: 5, customfield_3: true, customfield_4: "x" }))
      .toEqual({ ok: true, fields: { customfield_2: 5, customfield_3: true, customfield_4: "7" } });
  });

  it("projeto do Jira e instância do ServiceNow", () => {
    expect(validProjectKey("SUST")).toBe(true);
    expect(validProjectKey("1AB")).toBe(false);
    expect(normalizeInstance(" HTTPS://Empresa.service-now.com// ")).toBe("https://empresa.service-now.com");
    expect(validInstance("https://empresa.service-now.com")).toBe(true);
    expect(validInstance("https://evil.com/empresa.service-now.com")).toBe(false);
  });
});
