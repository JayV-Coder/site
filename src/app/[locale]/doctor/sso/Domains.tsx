"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmAction, FormField } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Schemas } from "@/modules/doctor/api";
import { normalizeDomain, validDomain } from "@/modules/doctor/sso";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { addDomain, removeDomain, verifyDomain } from "./actions";
import { CopyValue } from "./CopyValue";

type Domain = Schemas["SsoDomain"];

const WINDOW_MS = 60_000;
type Check = "checking" | "failed";

/** Depois de pedir a consulta ao DNS, a página relê (uma vez para todos os domínios) por um
 * minuto a partir do último pedido; o domínio que não verificou nesse tempo ganha o aviso. */
function useDnsChecks(domains: Domain[]) {
  const router = useRouter();
  const [until, setUntil] = useState<Record<string, number>>({});
  const [, tick] = useState(0);
  const pending = Object.keys(until).filter((id) => domains.some((item) => item.id === id && item.verified_at === null));
  const active = pending.some((id) => until[id]! > Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => { router.refresh(); tick((value) => value + 1); }, 5000);
    return () => window.clearInterval(timer);
  }, [active, router]);
  const state = (id: string): Check | null => {
    if (!pending.includes(id)) return null;
    return until[id]! > Date.now() ? "checking" : "failed";
  };
  return { state, asked: (id: string) => setUntil((current) => ({ ...current, [id]: Date.now() + WINDOW_MS })) };
}

function DomainRow({ domain, check, onAsked }: { domain: Domain; check: Check | null; onAsked: () => void }) {
  const t = useT();
  const say = useSay();
  const verify = useKeyedAction();
  const drop = useKeyedAction();
  const verified = domain.verified_at !== null;
  return (
    <li className="grid gap-2 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 font-mono text-sm break-all">{domain.domain}</span>
        <Badge variant={verified ? "success" : "warning"}>{t(verified ? "site.doctor.sso.verified" : "site.doctor.sso.unverified")}</Badge>
      </div>
      {!verified && (
        <div className="grid gap-2">
          <p className="text-xs text-muted-foreground">{t("site.doctor.sso.txtHint")}</p>
          <CopyValue label={t("site.doctor.sso.txtName")} value={domain.txt_name} />
          <CopyValue label={t("site.doctor.sso.txtValue")} value={domain.txt_value} />
          {check === "checking" && <p role="status" className="text-xs text-muted-foreground">{t("site.doctor.sso.checking")}</p>}
          {check === "failed" && <p role="status" className="text-xs text-warning">{t("site.doctor.sso.checkFailed")}</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!verified && (
          <Button type="button" size="sm" loading={verify.busy} onClick={() => verify.run((key) => verifyDomain(domain.id, key), onAsked)}>
            {t("site.doctor.sso.verify")}
          </Button>
        )}
        <ConfirmAction title={t("site.doctor.sso.removeDomainTitle", { domain: domain.domain })} description={t("site.doctor.sso.removeDomainBody")}
          confirm={t("site.doctor.sso.removeDomain")} onConfirm={() => drop.run((key) => removeDomain(domain.id, key))}>
          <Button type="button" size="sm" variant="outline" loading={drop.busy}>{t("site.doctor.sso.removeDomain")}</Button>
        </ConfirmAction>
      </div>
      {(verify.error ?? drop.error) && <p role="alert" className="text-sm text-destructive">{say((verify.error ?? drop.error)!)}</p>}
    </li>
  );
}

export function Domains({ domains }: { domains: Domain[] }) {
  const t = useT();
  const say = useSay();
  const add = useKeyedAction();
  const checks = useDnsChecks(domains);
  const [draft, setDraft] = useState("");
  const domain = normalizeDomain(draft);
  const invalid = domain !== "" && !validDomain(domain);

  return (
    <section aria-labelledby="doctor-sso-domains" className="grid gap-3">
      <h2 id="doctor-sso-domains" className="text-sm font-medium text-muted-foreground">{t("site.doctor.sso.domains")}</h2>
      <p className="text-xs text-muted-foreground">{t("site.doctor.sso.domainsHint")}</p>
      {domains.length === 0 && <p className="text-sm text-muted-foreground">{t("site.doctor.sso.noDomains")}</p>}
      <ul className="grid gap-3">{domains.map((item) => <DomainRow key={item.id} domain={item} check={checks.state(item.id)} onAsked={() => checks.asked(item.id)} />)}</ul>
      <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={(event) => {
        event.preventDefault();
        if (!domain || invalid) return;
        add.run((key) => addDomain(domain, key).then((result) => (result.ok ? null : result.error)), () => setDraft(""), domain);
      }}>
        <FormField label={t("site.doctor.sso.newDomain")} htmlFor="doctor-sso-domain" error={invalid ? t("site.doctor.sso.error.domain") : null}>
          <Input id="doctor-sso-domain" inputMode="url" autoCapitalize="none" spellCheck={false} placeholder="acme.com.br" value={draft}
            onChange={(event) => { add.reset(); setDraft(event.currentTarget.value); }} />
        </FormField>
        <Button type="submit" variant="outline" loading={add.busy} disabled={!domain || invalid}>{t("site.doctor.sso.addDomain")}</Button>
      </form>
      {add.error && <p role="alert" className="text-sm text-destructive">{say(add.error)}</p>}
    </section>
  );
}
