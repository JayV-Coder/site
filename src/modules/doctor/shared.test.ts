import { describe, expect, it } from "vitest";
import { dispositionFilename, shareToken } from "./shared";

describe("Relatório compartilhado", () => {
  it("o token vem do fragmento, com o tamanho que a API emite", () => {
    const token = "a".repeat(43);
    expect(shareToken(`#${token}`)).toBe(token);
    expect(shareToken(token)).toBe(token);
    expect(shareToken("#curto")).toBeNull();
    expect(shareToken(`#${"a".repeat(129)}`)).toBeNull();
    // Só o alfabeto do token (base64url): nada de espaço, barra ou parâmetros.
    expect(shareToken(`#${"a".repeat(40)} /x`)).toBeNull();
    expect(shareToken("")).toBeNull();
  });

  it("o nome do arquivo vem da resposta, com acentos (filename*), sem aspas ou entre aspas", () => {
    expect(dispositionFilename('attachment; filename="INC-0001.pdf"', "application/pdf")).toBe("INC-0001.pdf");
    expect(dispositionFilename("attachment; filename=INC-0001.md", "text/markdown")).toBe("INC-0001.md");
    expect(dispositionFilename("attachment; filename=\"relatorio.pdf\"; filename*=UTF-8''relat%C3%B3rio%20t%C3%A9cnico.pdf", null)).toBe("relatório técnico.pdf");
    expect(dispositionFilename("attachment; filename*=UTF-8'pt'relat%C3%B3rio.pdf", null)).toBe("relatório.pdf");
    // Sem caminho no nome: o navegador já ignora, mas a tela não repassa.
    expect(dispositionFilename('attachment; filename="../../x.pdf"', null)).toBe("x.pdf");
  });

  it("sem nome, a extensão vem do tipo do arquivo", () => {
    expect(dispositionFilename("attachment", "application/pdf; charset=binary")).toBe("report.pdf");
    expect(dispositionFilename(null, "text/markdown; charset=utf-8")).toBe("report.md");
    expect(dispositionFilename(null, null)).toBe("report");
  });
});
