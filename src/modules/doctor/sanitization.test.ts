import { describe, expect, it } from "vitest";
import { MAX_PATTERNS, previewSanitized, readRows, rowsPayload } from "./sanitization";

describe("Regras de Sanitização", () => {
  it("as regras salvas viram linhas na ordem do tipo", () => {
    expect(readRows({ matricula: "MAT-\\d{6}", contrato: "CT\\d+" })).toEqual([
      { kind: "contrato", pattern: "CT\\d+" }, { kind: "matricula", pattern: "MAT-\\d{6}" },
    ]);
    expect(readRows(undefined)).toEqual([]);
  });

  it("as linhas viram o corpo do PUT; linha toda vazia é ignorada", () => {
    expect(rowsPayload([{ kind: " matricula ", pattern: "MAT-\\d{6}" }, { kind: "", pattern: "" }]))
      .toEqual({ ok: true, patterns: { matricula: "MAT-\\d{6}" }, count: 1 });
  });

  it("recusa antes de enviar o que a API recusaria, dizendo a linha", () => {
    expect(rowsPayload([{ kind: "Matricula", pattern: "x\\d" }])).toEqual({ ok: false, index: 0, reason: "kind", field: "kind" });
    expect(rowsPayload([{ kind: "a", pattern: "x\\d" }])).toEqual({ ok: false, index: 0, reason: "kind", field: "kind" });
    expect(rowsPayload([{ kind: "ok_1", pattern: "" }])).toEqual({ ok: false, index: 0, reason: "empty", field: "pattern" });
    expect(rowsPayload([{ kind: "ok_1", pattern: "a".repeat(201) }])).toEqual({ ok: false, index: 0, reason: "length", field: "pattern" });
    // `(a+)+` trava o worker (backtracking catastrófico).
    expect(rowsPayload([{ kind: "ok_1", pattern: "(\\d+)+" }])).toEqual({ ok: false, index: 0, reason: "nested", field: "pattern" });
    expect(rowsPayload([{ kind: "ok_1", pattern: "\\d*" }])).toEqual({ ok: false, index: 0, reason: "matchesEmpty", field: "pattern" });
    expect(rowsPayload([{ kind: "ok_1", pattern: "x\\d" }, { kind: "ok_1", pattern: "y\\d" }])).toEqual({ ok: false, index: 1, reason: "duplicate", field: "kind" });
    expect(rowsPayload(Array.from({ length: MAX_PATTERNS + 1 }, (_, index) => ({ kind: `k${index}x`, pattern: "x\\d" })))).toEqual({ ok: false, index: MAX_PATTERNS, reason: "tooMany", field: "kind" });
  });

  it("parêntese escapado não é grupo: \\(\\d+\\)+ não é quantificador aninhado", () => {
    expect(rowsPayload([{ kind: "ok_1", pattern: "\\(\\d+\\)+" }])).toEqual({ ok: true, patterns: { ok_1: "\\(\\d+\\)+" }, count: 1 });
    expect(rowsPayload([{ kind: "ok_1", pattern: "((a+))+" }])).toMatchObject({ ok: false, reason: "nested" });
    expect(rowsPayload([{ kind: "ok_1", pattern: "(?:x\\d*)+" }])).toMatchObject({ ok: false, reason: "nested" });
    // Dentro de [ ] o + é literal.
    expect(rowsPayload([{ kind: "ok_1", pattern: "([+]x)+" }])).toMatchObject({ ok: true });
  });

  it("sintaxe só do Python (grupo nomeado) não é recusada aqui: a API decide", () => {
    expect(rowsPayload([{ kind: "pedido", pattern: "(?P<n>PED\\d+)" }])).toEqual({ ok: true, patterns: { pedido: "(?P<n>PED\\d+)" }, count: 1 });
  });

  it("a prévia troca o que cada padrão acha pelo marcador", () => {
    expect(previewSanitized("Matrícula MAT-123456 no contrato CT99", [{ kind: "matricula", pattern: "MAT-\\d{6}" }, { kind: "contrato", pattern: "CT\\d+" }]))
      .toBe("Matrícula [REMOVIDO:matricula] no contrato [REMOVIDO:contrato]");
    // O que não compila no navegador fica de fora da prévia.
    expect(previewSanitized("PED1", [{ kind: "pedido", pattern: "(?P<n>PED\\d+)" }])).toBe("PED1");
    // Como no worker: tudo é achado no texto original, e na sobreposição vale o primeiro.
    expect(previewSanitized("MAT-123456", [{ kind: "matricula", pattern: "MAT-\\d{6}" }, { kind: "tag", pattern: "REMOVIDO:\\w+" }])).toBe("[REMOVIDO:matricula]");
    expect(previewSanitized("abc123", [{ kind: "numero", pattern: "\\d+" }, { kind: "tudo", pattern: "abc\\d" }])).toBe("abc[REMOVIDO:numero]");
    // Linha que não pode ser salva não entra na prévia.
    expect(previewSanitized("x1 y2", [{ kind: "ok_1", pattern: "x\\d" }, { kind: "ok_1", pattern: "y\\d" }])).toBe("[REMOVIDO:ok_1] y2");
  });
});
