import { describe, expect, it } from "vitest";
import { downloadName, formatName, providerName, reportState, ticketBadge, ticketLine, ticketProviders } from "./reports";

describe("relatórios e chamados", () => {
  it("o formato tem nome próprio, igual em todo idioma", () => {
    expect(formatName("pdf")).toBe("PDF");
    expect(formatName("md")).toBe("Markdown");
    expect(providerName("jira")).toBe("Jira");
    expect(providerName("servicenow")).toBe("ServiceNow");
  });

  it("o relatório na fila ou rodando está gerando; pronto e falhou dizem o que são", () => {
    expect(reportState("queued")).toBe("generating");
    expect(reportState("running")).toBe("generating");
    expect(reportState("ready")).toBe("ready");
    expect(reportState("failed")).toBe("failed");
  });

  it("o arquivo baixado leva o código do Incidente e o formato", () => {
    expect(downloadName(42, "pdf")).toBe("inc-0042.pdf");
    expect(downloadName(12345, "md")).toBe("inc-12345.md");
  });

  it("o chamado mostra a chave e o status do ITSM; criando e falha têm texto próprio", () => {
    const ticket = { status: "open", external_key: "OPS-12", external_status: "Em andamento", error: null };
    expect(ticketLine(ticket)).toEqual({ text: "OPS-12 · Em andamento" });
    expect(ticketLine({ ...ticket, external_status: null })).toEqual({ text: "OPS-12" });
    // Aberto, mas sem chave nem status do ITSM ainda: diz que espera, em vez de um selo vazio.
    expect(ticketLine({ ...ticket, external_key: null, external_status: null })).toEqual({ key: "site.doctor.ticket.pending" });
    expect(ticketLine({ ...ticket, status: "creating" })).toEqual({ key: "site.doctor.ticket.creating" });
    expect(ticketLine({ ...ticket, status: "failed", error: "projeto inexistente" })).toEqual({ key: "site.doctor.ticket.failed", error: "projeto inexistente" });
    expect(ticketBadge("failed")).toBe("destructive");
    expect(ticketBadge("done")).toBe("success");
    expect(ticketBadge("open")).toBe("secondary");
  });

  it("aparecem os provedores com chamado e os conectados; só os conectados abrem", () => {
    const jira = { status: "active", project_key: "OPS" };
    const servicenow = { status: "active", instance_url: "https://acme.service-now.com" };
    expect(ticketProviders([], jira, servicenow, true)).toEqual([{ provider: "jira", canOpen: true }, { provider: "servicenow", canOpen: true }]);
    // Quem não opera só vê os chamados que existem.
    expect(ticketProviders([{ provider: "jira" }], jira, servicenow, false)).toEqual([{ provider: "jira", canOpen: false }]);
    // Jira sem projeto não abre; o chamado antigo do ServiceNow continua à vista.
    expect(ticketProviders([{ provider: "servicenow" }], { ...jira, project_key: null }, null, true))
      .toEqual([{ provider: "servicenow", canOpen: false }]);
    expect(ticketProviders([], { ...jira, status: "needs_reauth" }, null, true)).toEqual([]);
  });
});
