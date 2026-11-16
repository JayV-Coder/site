import { describe, expect, it } from "vitest";
import { contentTypeOf, documentKind, documentState, KNOWLEDGE_MAX_BYTES, titleOf } from "./knowledge";

describe("Base de conhecimento", () => {
  it("o tipo do arquivo pela extensão; outros não sobem", () => {
    expect(contentTypeOf("runbook.PDF")).toBe("application/pdf");
    expect(contentTypeOf("notas.markdown")).toBe("text/markdown");
    expect(contentTypeOf("a.docx")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(contentTypeOf("a.xlsx")).toBeNull();
    expect(KNOWLEDGE_MAX_BYTES).toBe(20 * 1024 * 1024);
  });

  it("o selo do documento: caso promovido de um Incidente ou o tipo do arquivo", () => {
    expect(documentKind({ source: "incident", content_type: null })).toBe("INC");
    expect(documentKind({ source: "upload", content_type: "text/plain" })).toBe("TXT");
    expect(documentKind({ source: "upload", content_type: "image/png" })).toBe("DOC");
  });

  it("o estado do documento", () => {
    expect(documentState("ready")).toEqual({ key: "site.doctor.knowledge.state.ready", variant: "success" });
    expect(documentState("failed")).toEqual({ key: "site.doctor.knowledge.state.failed", variant: "destructive" });
    expect(documentState("pending")).toEqual({ key: "site.doctor.knowledge.state.pending", variant: "outline" });
    expect(documentState("indexing")).toEqual({ key: "site.doctor.knowledge.state.indexing", variant: "outline" });
  });

  it("o título vem do nome do arquivo, sem a extensão", () => {
    expect(titleOf("Runbook SAP.v2.pdf")).toBe("Runbook SAP.v2");
    expect(titleOf("leia-me")).toBe("leia-me");
  });
});
