import { describe, expect, it } from "vitest";
import { agentCollections, agentState, buildCollections, validFunction, validPath } from "./agents";

const NOW = new Date("2026-11-17T12:00:00Z");
const agent = { status: "active", last_seen_at: "2026-11-17T11:50:00Z", registration_expires_at: null };

describe("agentes locais", () => {
  it("conectado até 15 min sem sinal; depois, sem contato", () => {
    expect(agentState(agent, NOW)).toEqual({ key: "site.doctor.agent.state.connected", variant: "success" });
    expect(agentState({ ...agent, last_seen_at: "2026-11-17T11:40:00Z" }, NOW)).toEqual({ key: "site.doctor.agent.state.silent", variant: "warning" });
    expect(agentState({ ...agent, last_seen_at: null }, NOW)).toEqual({ key: "site.doctor.agent.state.silent", variant: "warning" });
  });

  it("pendente aguarda o registro até o token vencer; revogado é revogado", () => {
    expect(agentState({ ...agent, status: "pending", registration_expires_at: "2026-11-18T00:00:00Z" }, NOW)).toEqual({ key: "site.doctor.agent.state.pending", variant: "outline" });
    expect(agentState({ ...agent, status: "pending", registration_expires_at: "2026-11-17T00:00:00Z" }, NOW)).toEqual({ key: "site.doctor.agent.state.expired", variant: "warning" });
    expect(agentState({ ...agent, status: "revoked" }, NOW)).toEqual({ key: "site.doctor.agent.state.revoked", variant: "destructive" });
  });

  it("as coletas autorizadas, como a API guarda", () => {
    expect(agentCollections({ collections: [{ type: "directory", path: "/exports/sap" }, { type: "rfc_table", table: "EDIDS" }, { type: "rfc_function", name: "Z_AID_X" }] }))
      .toEqual([{ kind: "directory", value: "/exports/sap" }, { kind: "table", value: "EDIDS" }, { kind: "function", value: "Z_AID_X" }]);
    expect(agentCollections({})).toEqual([]);
  });

  it("só o que foi marcado vira coleta; pasta absoluta e função Z_AID_", () => {
    expect(buildCollections({ directory: " /exports/sap ", pattern: "", idoc: true, fn: "" }))
      .toEqual([{ type: "directory", path: "/exports/sap", pattern: "*.csv" }, { type: "rfc_table", table: "EDIDS" }]);
    expect(buildCollections({ directory: "", pattern: "*.txt", idoc: false, fn: "Z_AID_READ_SLG1" })).toEqual([{ type: "rfc_function", name: "Z_AID_READ_SLG1" }]);
    expect(validPath("")).toBe(true);
    expect(validPath("exports")).toBe(false);
    expect(validFunction("Z_AID_READ_SLG1")).toBe(true);
    expect(validFunction("RFC_READ_TABLE")).toBe(false);
  });
});
