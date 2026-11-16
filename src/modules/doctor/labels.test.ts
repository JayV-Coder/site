import { describe, expect, it } from "vitest";
import {
  ageParts, bucketLabel, isOperator, utcDateTime, canManage, changeArrow, durationParts, executionStatusKey, executionTitle, incidentCode, initials, isManager,
  mttrParts, NEXT_STATUSES, peak, slugify,
} from "./labels";

describe("rótulos do Doctor", () => {
  it("numera o Incidente com quatro casas", () => {
    expect(incidentCode(7)).toBe("INC-0007");
    expect(incidentCode(12345)).toBe("INC-12345");
  });

  it("dá a idade na maior unidade que cabe: minutos, horas até 48 h, depois dias", () => {
    const now = new Date("2026-11-13T12:00:00Z");
    expect(ageParts("2026-11-13T11:15:00Z", now)).toEqual({ unit: "minutes", count: 45 });
    expect(ageParts("2026-11-12T12:00:00Z", now)).toEqual({ unit: "hours", count: 24 });
    expect(ageParts("2026-11-10T12:00:00Z", now)).toEqual({ unit: "days", count: 3 });
    // Relógio do navegador atrasado não vira idade negativa.
    expect(ageParts("2026-11-13T12:05:00Z", now)).toEqual({ unit: "minutes", count: 0 });
  });

  it("separa o MTTR em minutos ou horas e minutos, e some sem valor", () => {
    expect(mttrParts(null)).toBeNull();
    expect(mttrParts(42.4)).toEqual({ minutes: 42 });
    expect(mttrParts(125)).toEqual({ hours: 2, minutes: "05" });
  });

  it("a seta diz a direção da variação", () => {
    expect(changeArrow(0.12)).toBe("▲");
    expect(changeArrow(-0.5)).toBe("▼");
    expect(changeArrow(0)).toBe("=");
  });

  it("rotula a barra pela hora ou pelo dia, em UTC", () => {
    expect(bucketLabel("2026-11-13T09:00:00Z", "hour")).toBe("9h");
    expect(bucketLabel("2026-11-03T00:00:00Z", "day")).toBe("03/11");
  });

  it("acha o pico de falhas, e não há pico sem falha", () => {
    const buckets = [{ start: "a", failed: 2 }, { start: "b", failed: 9 }, { start: "c", failed: 9 }];
    expect(peak(buckets)?.start).toBe("b");
    expect(peak([{ start: "a", failed: 0 }])).toBeNull();
  });

  it("só Owner e Admin administram, e as ações pedem MFA", () => {
    expect(isManager("owner")).toBe(true);
    expect(isManager("analyst")).toBe(false);
    expect(isManager(null)).toBe(false);
    expect(canManage({ active_role: "admin", aal: "aal2" })).toBe(true);
    expect(canManage({ active_role: "admin", aal: "aal1" })).toBe(false);
    expect(canManage(null)).toBe(false);
  });

  it("sugere o identificador e as iniciais a partir do nome", () => {
    expect(slugify("  Varejo São João Ltda.  ")).toBe("varejo-sao-joao-ltda");
    expect(slugify("x".repeat(60))).toHaveLength(40);
    expect(initials("acme integrações brasil")).toBe("AI");
  });
});

describe("rótulos de Incidente e Execução", () => {
  it("só oferece as transições de status que o banco aceita", () => {
    expect(NEXT_STATUSES.open).toEqual(["investigating", "resolved", "dismissed"]);
    expect(NEXT_STATUSES.resolved).toEqual(["open"]);
    expect(NEXT_STATUSES.dismissed).toEqual(["open"]);
  });

  it("separa a duração em ms, segundos com uma casa, ou minutos e segundos", () => {
    expect(durationParts(850)).toEqual({ unit: "ms", value: 850 });
    expect(durationParts(12_345)).toEqual({ unit: "s", value: 12.3 });
    expect(durationParts(125_000)).toEqual({ unit: "min", minutes: 2, seconds: 5 });
  });

  it("dá à Execução o nome do execution_id e do trace, ou o começo do id", () => {
    expect(executionTitle("0190f3a1-7b2c", { execution_id: ["PED-1"], trace_id: ["abc"] })).toBe("PED-1 · abc");
    expect(executionTitle("0190f3a1-7b2c", {})).toBeNull();
  });

  it("conhece os status de Execução", () => {
    expect(executionStatusKey("pending_confirmation")).toBe("site.doctor.execution.status.pending_confirmation");
    expect(executionStatusKey("outro")).toBeNull();
  });

  it("operam o Incidente Owner, Admin e Analyst; Viewer só lê", () => {
    expect(["owner", "admin", "analyst"].every(isOperator)).toBe(true);
    expect(isOperator("viewer")).toBe(false);
    expect(isOperator(null)).toBe(false);
  });

  it("data e hora curtas em UTC, no formato do idioma", () => {
    expect(utcDateTime("pt-BR", "2026-11-16T01:49:00Z")).toBe("16/11/2026, 01:49 UTC");
    expect(utcDateTime("en", "2026-11-16T01:49:00Z")).toBe("11/16/26, 1:49 AM UTC");
  });
});
