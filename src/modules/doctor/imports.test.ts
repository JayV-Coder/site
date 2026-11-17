import { describe, expect, it } from "vitest";
import { formatOf, headerColumns, IMPORT_FIELDS, importBadge, initialMapping, mappableColumns, mappingChanged, mergeMapping, needsRefresh } from "./imports";

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
    // Só o começo de um JSON grande: basta o primeiro registro completo.
    expect(headerColumns("json", '[{"ts":"x","msg":"a}b"},{"ts":"y"')).toEqual(["ts", "msg"]);
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

  it("só colunas que a API aceita: até 200 caracteres e sem espaço nas pontas", () => {
    expect(mappableColumns(["a", " b", "c ", "x".repeat(201), "y".repeat(200)])).toEqual(["a", "y".repeat(200)]);
  });

  it("salvar muda só os campos que a pessoa escolheu; o resto do salvo fica", () => {
    const saved = { timestamp: "Quando", message: "Texto" };
    expect(mergeMapping(saved, { severity: "Tipo" }, new Set(["severity"]))).toEqual({ timestamp: "Quando", message: "Texto", severity: "Tipo" });
    // Voltar a "reconhecer pelo nome" tira o campo.
    expect(mergeMapping(saved, {}, new Set(["message"]))).toEqual({ timestamp: "Quando" });
    // Sugestão que ninguém tocou não é salva.
    expect(mergeMapping({}, { message: "msg" }, new Set())).toEqual({});
  });

  it("a página relê enquanto há Importação andando; pendente esquecida para de contar", () => {
    const now = new Date("2026-11-17T12:00:00Z");
    expect(needsRefresh([{ status: "processing", created_at: "2026-11-10T00:00:00Z" }], now)).toBe(true);
    expect(needsRefresh([{ status: "pending", created_at: "2026-11-17T11:55:00Z" }], now)).toBe(true);
    expect(needsRefresh([{ status: "pending", created_at: "2026-11-17T10:00:00Z" }], now)).toBe(false);
    expect(needsRefresh([{ status: "done", created_at: "2026-11-17T11:59:00Z" }], now)).toBe(false);
  });
});
