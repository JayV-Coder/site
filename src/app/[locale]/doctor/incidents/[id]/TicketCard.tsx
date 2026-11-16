"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Schemas } from "@/modules/doctor/api";
import { providerName, ticketBadge, ticketLine, type Provider } from "@/modules/doctor/reports";
import { useSay, useT } from "@/modules/i18n";
import { openTicket } from "../actions";
import { useKeyedAction } from "./useKeyedAction";

type Ticket = Schemas["Ticket"];

/** Os chamados do Incidente (#43 Jira, #44 ServiceNow): um por provedor, com a chave e o status
 * que voltam do ITSM. Resolvido lá só sugere: quem resolve o Incidente é uma pessoa, aqui. */
export function TicketCard({ incidentId, tickets, providers, operator, resolved }: {
  incidentId: string; tickets: Ticket[]; providers: { provider: Provider; canOpen: boolean }[]; operator: boolean; resolved: boolean;
}) {
  const t = useT();
  return (
    <section aria-labelledby="doctor-tickets" className="grid gap-3 rounded-lg border border-border bg-card px-4 py-4">
      <h2 id="doctor-tickets" className="text-sm font-medium">{t("site.doctor.ticket.title")}</h2>
      {providers.map(({ provider, canOpen }) => (
        <ProviderTicket key={provider} incidentId={incidentId} provider={provider} resolved={resolved}
          ticket={tickets.find((ticket) => ticket.provider === provider)} canOpen={operator && canOpen} />
      ))}
    </section>
  );
}

function ProviderTicket({ incidentId, provider, ticket, canOpen, resolved }: {
  incidentId: string; provider: Provider; ticket: Ticket | undefined; canOpen: boolean; resolved: boolean;
}) {
  const t = useT();
  const say = useSay();
  const action = useKeyedAction();
  const name = providerName(provider);
  const line = ticket ? ticketLine(ticket) : null;
  return (
    <div role="group" aria-label={t("site.doctor.ticket.label", { provider: name })} className="grid gap-1.5 border-t border-border/60 pt-3 first-of-type:border-t-0 first-of-type:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm">{name}</span>
        {ticket && line && (
          <Badge variant={ticketBadge(ticket.status)} className="max-w-full">
            <span className="truncate">{"text" in line ? line.text : t(line.key)}</span>
          </Badge>
        )}
      </div>
      {line && "error" in line && line.error && <p className="text-xs break-words text-muted-foreground">{t("site.doctor.diagnosis.failedDetail", { error: line.error })}</p>}
      {ticket?.assignment_group && <p className="text-xs text-muted-foreground">{t("site.doctor.ticket.group", { group: ticket.assignment_group })}</p>}
      {ticket?.url && (
        <a className="w-fit text-sm underline underline-offset-4" href={ticket.url} target="_blank" rel="noreferrer">
          {t("site.doctor.ticket.openIn", { provider: name })} <span aria-hidden="true">↗</span>
        </a>
      )}
      {ticket?.status === "done" && !resolved && (
        <p role="status" className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm">{t("site.doctor.ticket.doneThere", { provider: name })}</p>
      )}
      {action.error && <p role="alert" className="text-sm text-destructive">{say(action.error)}</p>}
      {canOpen && (!ticket || ticket.status === "failed") && (
        <Button variant="outline" className="justify-self-start" loading={action.busy} onClick={() => action.run((key) => openTicket(incidentId, provider, key))}>
          {t(ticket ? "site.doctor.ticket.retry" : "site.doctor.ticket.open", { provider: name })}
        </Button>
      )}
    </div>
  );
}
