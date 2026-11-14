import { describe, expect, it } from "vitest";
import { ageParts, bucketLabel, canManage, changeArrow, incidentCode, initials, isManager, mttrParts, peak, slugify } from "./labels";

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
