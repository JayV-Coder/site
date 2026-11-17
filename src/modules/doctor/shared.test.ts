import { describe, expect, it } from "vitest";
import { downloadName, shareToken } from "./shared";

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

  it("o nome do arquivo vem da resposta, com acentos (filename*) ou sem", () => {
    expect(downloadName('attachment; filename="INC-0001.pdf"')).toBe("INC-0001.pdf");
    expect(downloadName("attachment; filename=\"relatorio.pdf\"; filename*=UTF-8''relat%C3%B3rio%20t%C3%A9cnico.pdf")).toBe("relatório técnico.pdf");
    expect(downloadName("attachment")).toBe("report");
    expect(downloadName(null)).toBe("report");
    // Sem caminho no nome: o navegador já ignora, mas a tela não repassa.
    expect(downloadName('attachment; filename="../../x.pdf"')).toBe("x.pdf");
  });
});
