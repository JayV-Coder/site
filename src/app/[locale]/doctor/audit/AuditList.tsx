"use client";

import { Fragment, useRef, useState, useTransition } from "react";
import { DownloadIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Schemas } from "@/modules/doctor/api";
import { actorOf, auditTone, describeEntry } from "@/modules/doctor/audit";
import { roleKey, utcDateTime } from "@/modules/doctor/labels";
import { useT } from "@/modules/i18n";
import { cn } from "@/lib/utils";
import { findAudit } from "./actions";

type AuditPage = Schemas["AuditPage"];
type Entry = Schemas["AuditEntry"];

const DOT = { serious: "bg-destructive", good: "bg-success", neutral: "bg-muted-foreground" } as const;

export function AuditList({ locale, category, initial }: { locale: string; category: string | null; initial: AuditPage }) {
  const t = useT();
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.next_cursor);
  // O termo fica só na memória da página: pode ser o e-mail de alguém.
  const [term, setTerm] = useState("");
  // O termo da busca que gerou a lista: "Carregar mais" e o CSV seguem o que está na tela.
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, startBusy] = useTransition();
  // Só a resposta do último pedido vale (uma busca nova enquanto a anterior não voltou).
  const round = useRef(0);

  const run = (q: string | null, after: string | null) => {
    const mine = ++round.current;
    startBusy(async () => {
      const page = await findAudit(category, q, after).catch(() => null);
      if (mine !== round.current) return;
      if (page === null || page === "forbidden") { setFailed(true); return; }
      setFailed(false);
      setSubmitted(q);
      setItems((current) => (after ? [...current, ...page.items] : page.items));
      setCursor(page.next_cursor);
    });
  };

  const text = (entry: Entry) => {
    const described = describeEntry(entry);
    if ("text" in described) return described.text;
    const params = { ...described.params };
    for (const name of ["from", "to"] as const) {
      const role = params[name];
      const key = typeof role === "string" ? roleKey(role) : null;
      if (key) params[name] = t(key);
    }
    return t(described.key, params);
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start gap-2">
        <form role="search" className="flex min-w-0 flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); run(term.trim() || null, null); }}>
          <Input type="search" autoCapitalize="none" spellCheck={false} aria-label={t("site.doctor.audit.filter")} placeholder={t("site.doctor.audit.filterHint")}
            value={term} onChange={(event) => setTerm(event.currentTarget.value)} />
          <Button type="submit" variant="outline" loading={busy} aria-label={t("site.doctor.audit.filter")}><SearchIcon /></Button>
        </form>
        <form method="post" action={`/${locale}/doctor/audit/export`}>
          <input type="hidden" name="category" value={category ?? ""} />
          <input type="hidden" name="q" value={submitted ?? ""} />
          <Button type="submit" variant="outline"><DownloadIcon />{t("site.doctor.audit.export")}</Button>
        </form>
      </div>
      {failed && <p role="alert" className="text-sm text-destructive">{t("site.doctor.audit.searchFailed")}</p>}
      {items.length === 0 ? <p role="status" className="text-sm text-muted-foreground">{t("site.doctor.audit.empty")}</p> : (
        <ol aria-label={t("site.doctor.audit.trail")} className="grid gap-2">
          {items.map((entry) => {
            const actor = actorOf(entry);
            // Ação que a tela não conhece já aparece pelo nome na frase: não repete embaixo.
            const known = !("text" in describeEntry(entry));
            return (
              <li key={entry.id} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[auditTone(entry.action)])} />
                <span className="grid min-w-0 gap-1">
                  <span className="text-sm break-words"><b className="font-medium">{"text" in actor ? actor.text : t(actor.key)}</b> {text(entry)}</span>
                  <span className="font-mono text-xs break-all text-muted-foreground">
                    {/* Cada parte isolada: em árabe, o IP e a data não se misturam com o resto. */}
                    {[known && entry.action, entry.resource_id?.slice(0, 8), entry.ip && t("site.doctor.audit.ip", { ip: entry.ip }), utcDateTime(locale, entry.occurred_at)]
                      .filter((part): part is string => Boolean(part))
                      .map((part, index) => <Fragment key={index}>{index > 0 && " · "}<bdi>{part}</bdi></Fragment>)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {cursor && <Button type="button" variant="outline" className="justify-self-start" loading={busy} onClick={() => run(submitted, cursor)}>{t("site.doctor.audit.loadMore")}</Button>}
    </div>
  );
}
