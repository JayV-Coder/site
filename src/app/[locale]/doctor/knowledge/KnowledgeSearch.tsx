"use client";

import { useRef, useState, useTransition } from "react";
import { SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Schemas } from "@/modules/doctor/api";
import { useT } from "@/modules/i18n";
import { searchKnowledge } from "./actions";

/** A busca na Base: a pergunta fica só na memória da página e vai no corpo da requisição. */
export function KnowledgeSearch() {
  const t = useT();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Schemas["KnowledgeResults"] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, startBusy] = useTransition();
  // Só a resposta da última busca vale: uma anterior mais lenta não troca o resultado.
  const round = useRef(0);
  return (
    <section aria-label={t("site.doctor.knowledge.search")} className="grid gap-3">
      <form role="search" className="flex gap-2" onSubmit={(event) => {
        event.preventDefault();
        if (term.trim().length < 2) return;
        const mine = ++round.current;
        startBusy(async () => {
          const found = await searchKnowledge(term).catch(() => null);
          if (mine !== round.current) return;
          setFailed(found === null);
          setResults(found);
        });
      }}>
        <Input type="search" aria-label={t("site.doctor.knowledge.search")} placeholder={t("site.doctor.knowledge.searchHint")} value={term} onChange={(event) => setTerm(event.currentTarget.value)} />
        <Button type="submit" variant="outline" loading={busy} aria-label={t("site.doctor.knowledge.search")}><SearchIcon /></Button>
      </form>
      {failed && <p role="alert" className="text-sm text-destructive">{t("site.doctor.incidents.searchFailed")}</p>}
      {results && (
        <div role="status" className="grid gap-2">
          {results.mode === "text" && <p className="text-xs text-muted-foreground">{t("site.doctor.knowledge.textOnly")}</p>}
          {results.items.length === 0 && <p className="text-sm text-muted-foreground">{t("site.doctor.knowledge.noResults")}</p>}
          <ul className="grid gap-2">
            {results.items.map((hit, index) => (
              <li key={`${hit.document_id}-${index}`} className="grid gap-1 rounded-lg border border-border bg-card px-4 py-3">
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0 text-sm font-medium break-words">{hit.title}</span>
                  <Badge variant={hit.origin === "global" ? "secondary" : "outline"}>{t(hit.origin === "global" ? "site.doctor.knowledge.global" : "site.doctor.knowledge.mine")}</Badge>
                </span>
                {hit.heading && <span className="text-xs text-muted-foreground break-words">{hit.heading}</span>}
                <p className="text-sm break-words">{hit.excerpt}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
