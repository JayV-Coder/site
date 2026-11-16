"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { EmptyText } from "@/components/atoms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Schemas } from "@/modules/doctor/api";
import type { ExecutionFilters } from "@/modules/doctor/executions";
import {
  durationText, environmentKey, executionStatusKey, executionStatusVariant, executionTitle, isOpenIncident, severityVariant, utcDateTime,
} from "@/modules/doctor/labels";
import { useHref, useLocale, useT } from "@/modules/i18n";
import { findExecutions } from "./actions";

type ExecutionPage = Schemas["ExecutionPage"];
type ExecutionSummary = Schemas["ExecutionSummary"];


export function ExecutionList({ filters, since, initial }: { filters: ExecutionFilters; since: string; initial: ExecutionPage }) {
  const t = useT();
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.next_cursor);
  // O termo fica só na memória da página: pode ser um nº de pedido.
  const [term, setTerm] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, startBusy] = useTransition();

  const run = (q: string | null, after: string | null) => {
    startBusy(async () => {
      const page = await findExecutions(filters, since, q, after).catch(() => null);
      setFailed(page === null);
      if (page === null) return;
      setSearched(q);
      setItems((current) => (after ? [...current, ...page.items] : page.items));
      setCursor(page.next_cursor);
    });
  };

  return (
    <div className="grid gap-3">
      <form role="search" className="flex gap-2" onSubmit={(event) => { event.preventDefault(); run(term.trim() || null, null); }}>
        <Input type="search" aria-label={t("site.doctor.executions.search")} placeholder={t("site.doctor.executions.searchHint")}
          autoCapitalize="none" spellCheck={false} value={term} onChange={(event) => setTerm(event.currentTarget.value)} />
        <Button type="submit" variant="outline" loading={busy} aria-label={t("site.doctor.executions.search")}><SearchIcon /></Button>
      </form>
      <p className="text-xs text-muted-foreground">{t("site.doctor.executions.searchNote")}</p>
      {failed && <p role="alert" className="text-sm text-destructive">{t("site.doctor.incidents.searchFailed")}</p>}
      {items.length === 0 && <EmptyText role="status">{searched ? t("site.doctor.executions.noResults") : t("site.doctor.executions.noneFiltered")}</EmptyText>}
      <ul className="grid gap-2">
        {items.map((item) => <li key={item.id}><ExecutionCard item={item} /></li>)}
      </ul>
      {cursor && <Button variant="outline" className="justify-self-start" loading={busy} onClick={() => run(searched, cursor)}>{t("site.doctor.incidents.more")}</Button>}
    </div>
  );
}

function ExecutionCard({ item }: { item: ExecutionSummary }) {
  const t = useT();
  const href = useHref();
  const locale = useLocale();
  const status = executionStatusKey(item.status);
  const environment = environmentKey(item.environment);
  const duration = durationText(t, locale, item.duration_ms);
  const title = executionTitle(item.id, item.correlation_keys) ?? t("site.doctor.incident.execution", { id: item.id.slice(0, 8) });
  return (
    <Link href={href(`/doctor/executions/${item.id}`)}
      className="grid gap-1.5 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary/40">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={executionStatusVariant(item.status)}>{status ? t(status) : item.status}</Badge>
        {item.incident && isOpenIncident(item.incident.status) && (
          <Badge variant={severityVariant(item.incident.severity)}>{t("site.doctor.incident.title")}</Badge>
        )}
      </span>
      <span className="truncate font-mono text-xs">{title}</span>
      <span className="text-xs text-muted-foreground">
        {item.integration_name} · {environment ? t(environment) : item.environment} · {duration} · {t("site.doctor.executions.events", { count: item.event_count })} · {utcDateTime(locale, item.first_event_at)}
      </span>
    </Link>
  );
}
