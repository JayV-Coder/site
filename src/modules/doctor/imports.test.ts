import { describe, expect, it } from "vitest";
import { formatOf, headerColumns, IMPORT_FIELDS, importBadge, initialMapping, mappingChanged } from "./imports";

describe("Importação", () => {
  it("o formato vem da extensão; outros arquivos a API recusa", () => {
    expect(formatOf("logs.CSV")).toBe("csv");
    expect(formatOf("a.ndjson")).toBe("ndjson");
    expect(formatOf("a.json")).toBe("json");
    expect(formatOf("a.txt")).toBeNull();
  });

  it("o cabeçalho do CSV: separador mais comum, aspas e BOM", () => {
    expect(headerColumns("csv", "﻿Quando;Tipo;\"Texto; da mensagem\"\n2026;E;x")).toEqual(["Quando", "Tipo", "Texto; da mensagem"]);
    expect(headerColumns("csv", "a,b,c\n1,2,3")).toEqual(["a", "b", "c"]);
    expect(headerColumns("csv", "a\tb\n1\t2")).toEqual(["a", "b"]);
  });

  it("NDJSON e JSON: as chaves do primeiro registro", () => {
    expect(headerColumns("ndjson", '{"ts":1,"msg":"x"}\n{"ts":2}')).toEqual(["ts", "msg"]);
    expect(headerColumns("json", '[{"Data/Hora":"x","Nivel":"E"}]')).toEqual(["Data/Hora", "Nivel"]);
    expect(headerColumns("json", '{"timestamp":"x"}')).toEqual(["timestamp"]);
    // Sem como ler o começo (JSON cortado, NDJSON inválido): sem mapeamento na tela.
    expect(headerColumns("json", '[{"a":')).toBeNull();
    expect(headerColumns("ndjson", "não é json")).toBeNull();
  });

  it("o mapeamento salvo vale quando a coluna existe no arquivo; senão, a sugestão", () => {
    const columns = ["Quando", "Tipo", "Rotina"];
    expect(initialMapping(columns, { timestamp: "Quando", severity: "Nivel" }, { severity: "Tipo", operation: "Rotina" }))
      .toEqual({ timestamp: "Quando", severity: "Tipo", operation: "Rotina" });
    // Campo fora do contrato é ignorado.
    expect(initialMapping(columns, {}, { nada: "Quando" })).toEqual({});
    expect(IMPORT_FIELDS).toHaveLength(8);
  });

  it("muda quando algum campo aponta para outra coluna (ou deixa de apontar)", () => {
    expect(mappingChanged({ timestamp: "a" }, { timestamp: "a" })).toBe(false);
    expect(mappingChanged({ timestamp: "a" }, { timestamp: "b" })).toBe(true);
    expect(mappingChanged({ timestamp: "a", severity: "b" }, { timestamp: "a" })).toBe(true);
  });

  it("o selo da Importação", () => {
    expect(importBadge("done")).toEqual({ key: "site.doctor.import.status.done", variant: "success" });
    expect(importBadge("rejected")).toEqual({ key: "site.doctor.import.status.rejected", variant: "destructive" });
    expect(importBadge("processing")).toEqual({ key: "site.doctor.import.status.processing", variant: "outline" });
  });
});
