"use client";

import { useState, type ReactNode } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Schemas } from "@/modules/doctor/api";
import type { Text } from "@/modules/i18n/types";
import { useSay, useT } from "@/modules/i18n";
import { cn } from "@/lib/utils";

type TestResult = Schemas["TestResult"];

/** O passo atual: o título, a posição e a barra dos quatro. */
export function WizardStep({ provider, step, titles, children }: { provider: string; step: number; titles: string[]; children: ReactNode }) {
  const t = useT();
  return (
    <section aria-labelledby="doctor-wizard-step" className="grid max-w-2xl gap-4">
      <div className="grid gap-2">
        <span className="text-xs text-muted-foreground">{t("site.doctor.wizard.stepOf", { provider, step, total: titles.length })}</span>
        <div aria-hidden="true" className="grid grid-cols-4 gap-1">
          {titles.map((title, index) => <span key={title} className={cn("h-1 rounded-full", index < step ? "bg-foreground" : "bg-muted")} />)}
        </div>
        <h2 id="doctor-wizard-step" className="text-lg font-semibold">{titles[step - 1]}</h2>
      </div>
      {children}
    </section>
  );
}

export function WizardActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-between gap-2 border-t border-border/60 pt-4">{children}</div>;
}

/** O que já ficou feito nos passos anteriores. */
export function WizardDone({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-1 rounded-lg border border-border bg-secondary px-4 py-3 text-sm">
      {items.map((item) => <li key={item} className="flex items-center gap-2"><CheckIcon aria-hidden="true" className="size-4 text-success" />{item}</li>)}
    </ul>
  );
}

/** O resultado de um teste: o selo traduzido e o texto do provedor, como veio da API. */
export function TestOutcome({ result, error }: { result: TestResult | null; error: Text | null }) {
  const t = useT();
  const say = useSay();
  if (error) return <p role="alert" className="text-sm text-destructive">{say(error)}</p>;
  if (!result) return null;
  return (
    <div role={result.ok ? "status" : "alert"} className={cn("rounded-md border px-3 py-2 text-sm", result.ok ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10")}>
      <p className="font-medium">{t(result.ok ? "site.doctor.connector.testOk" : "site.doctor.connector.testFailed")}</p>
      <p className="mt-1 text-xs break-words">{result.message}</p>
    </div>
  );
}

/** Um comando para copiar e colar no Cloud Shell. */
export function CopyCommand({ command }: { command: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2">
      <code dir="ltr" className="min-w-0 flex-1 font-mono text-xs leading-relaxed break-all">{command}</code>
      <Button variant="ghost" size="sm" aria-label={t("site.doctor.event.copy")} onClick={() => {
        void navigator.clipboard.writeText(command).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 2000); }, () => {});
      }}>{copied ? <CheckIcon /> : <CopyIcon />}</Button>
    </div>
  );
}
