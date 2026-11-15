"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { EmptyText } from "@/components/atoms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Schemas } from "@/modules/doctor/api";
import { ageParts, environmentKey, incidentCode, severityKey, severityVariant, statusKey } from "@/modules/doctor/labels";
import { useHref, useLocale, useT } from "@/modules/i18n";
import { findIncidents, type IncidentFilters } from "./actions";

type IncidentPage = Schemas["IncidentPage"];
type IncidentSummary = Schemas["IncidentSummary"];

/** A lista com busca e "Carregar mais". Sem busca nem página extra, ela acompanha o que o
 * servidor redesenha (a cada 20 s); com elas, a pessoa está olhando outro recorte. */
export function IncidentList({ filters, initial }: { filters: IncidentFilters; initial: IncidentPage }) {
  const t = useT();
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.next_cursor);
  // O termo fica só na memória da página: pode ser um nº de pedido.
  const [term, setTerm] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, startBusy] = useTransition();
  const browsing = useRef(false);
  useEffect(() => {
    if (browsing.current) return;
    setItems(initial.items);
    setCursor(initial.next_cursor);
  }, [initial]);

  const run = (q: string | null, after: string | null) => {
    startBusy(async () => {
      const page = await findIncidents(filters, q, after).catch(() => null);
      setFailed(page === null);
      if (page === null) return;
      setSearched(q);
      browsing.current = q !== null || after !== null;
      setItems((current) => (after ? [...current, ...page.items] : page.items));
      setCursor(page.next_cursor);
    });
  };

  return (
    <div className="grid gap-3">
      <form role="search" className="flex gap-2" onSubmit={(event) => { event.preventDefault(); run(term.trim() || null, null); }}>
        <Input type="search" aria-label={t("site.doctor.incidents.search")} placeholder={t("site.doctor.incidents.searchHint")}
          autoCapitalize="none" spellCheck={false} value={term} onChange={(event) => setTerm(event.currentTarget.value)} />
        <Button type="submit" variant="outline" loading={busy} aria-label={t("site.doctor.incidents.search")}><SearchIcon /></Button>
      </form>
      {failed && <p role="alert" className="text-sm text-destructive">{t("site.doctor.incidents.searchFailed")}</p>}
      {items.length === 0 && <EmptyText role="status">{searched ? t("site.doctor.incidents.noResults") : t("site.doctor.incidents.noneFiltered")}</EmptyText>}
      <ul className="grid gap-2">
        {items.map((item) => <li key={item.id}><IncidentCard item={item} /></li>)}
      </ul>
      {cursor && <Button variant="outline" className="justify-self-start" loading={busy} onClick={() => run(searched, cursor)}>{t("site.doctor.incidents.more")}</Button>}
    </div>
  );
}

function IncidentCard({ item }: { item: IncidentSummary }) {
  const t = useT();
  const href = useHref();
  const locale = useLocale();
  const code = incidentCode(item.number);
  const age = ageParts(item.last_seen_at, new Date());
  const severity = severityKey(item.severity);
  const status = statusKey(item.status);
  const environment = environmentKey(item.environment);
  return (
    <Link href={href(`/doctor/incidents/${item.id}`)} aria-label={`${code} ${item.title}`}
      className="grid gap-1.5 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary/40">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={severityVariant(item.severity)}>{severity ? t(severity) : item.severity}</Badge>
        <span className="font-mono text-xs text-muted-foreground">{code} · {t(`site.doctor.age.${age.unit}`, { count: age.count })}</span>
      </span>
      <span className="text-sm font-medium break-words">{item.title}</span>
      <span className="flex flex-wrap gap-1.5">
        <Badge variant="outline" mono>{item.category} · {item.rule_code}</Badge>
        <Badge variant="secondary">{status ? t(status) : item.status}</Badge>
      </span>
      <span className="text-xs text-muted-foreground">
        {item.integration_name} · {environment ? t(environment) : item.environment} · {t("site.doctor.dashboard.executionCount", { count: item.execution_count })}
        <span className="sr-only"> · {new Intl.NumberFormat(locale).format(item.execution_count)}</span>
      </span>
    </Link>
  );
}
