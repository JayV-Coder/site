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
      .toEqual({ ok: true, patterns: { matricula: "MAT-\\d{6}" } });
  });

  it("recusa antes de enviar o que a API recusaria, dizendo a linha", () => {
    expect(rowsPayload([{ kind: "Matricula", pattern: "x\\d" }])).toEqual({ ok: false, index: 0, reason: "kind" });
    expect(rowsPayload([{ kind: "a", pattern: "x\\d" }])).toEqual({ ok: false, index: 0, reason: "kind" });
    expect(rowsPayload([{ kind: "ok_1", pattern: "" }])).toEqual({ ok: false, index: 0, reason: "empty" });
    expect(rowsPayload([{ kind: "ok_1", pattern: "a".repeat(201) }])).toEqual({ ok: false, index: 0, reason: "length" });
    // `(a+)+` trava o worker (backtracking catastrófico).
    expect(rowsPayload([{ kind: "ok_1", pattern: "(\\d+)+" }])).toEqual({ ok: false, index: 0, reason: "nested" });
    expect(rowsPayload([{ kind: "ok_1", pattern: "\\d*" }])).toEqual({ ok: false, index: 0, reason: "matchesEmpty" });
    expect(rowsPayload([{ kind: "ok_1", pattern: "x\\d" }, { kind: "ok_1", pattern: "y\\d" }])).toEqual({ ok: false, index: 1, reason: "duplicate" });
    expect(rowsPayload(Array.from({ length: MAX_PATTERNS + 1 }, (_, index) => ({ kind: `k${index}x`, pattern: "x\\d" })))).toEqual({ ok: false, index: MAX_PATTERNS, reason: "tooMany" });
  });

  it("sintaxe só do Python (grupo nomeado) não é recusada aqui: a API decide", () => {
    expect(rowsPayload([{ kind: "pedido", pattern: "(?P<n>PED\\d+)" }])).toEqual({ ok: true, patterns: { pedido: "(?P<n>PED\\d+)" } });
  });

  it("a prévia troca o que cada padrão acha pelo marcador", () => {
    expect(previewSanitized("Matrícula MAT-123456 no contrato CT99", [{ kind: "matricula", pattern: "MAT-\\d{6}" }, { kind: "contrato", pattern: "CT\\d+" }]))
      .toBe("Matrícula [REMOVIDO:matricula] no contrato [REMOVIDO:contrato]");
    // O que não compila no navegador fica de fora da prévia.
    expect(previewSanitized("PED1", [{ kind: "pedido", pattern: "(?P<n>PED\\d+)" }])).toBe("PED1");
  });
});
