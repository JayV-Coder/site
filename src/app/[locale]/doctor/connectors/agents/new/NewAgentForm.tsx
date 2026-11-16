"use client";

import { useState } from "react";
import Link from "next/link";
import { FormField, OptionSelect } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { Schemas } from "@/modules/doctor/api";
import { buildCollections, validFunction, validPath, type CollectionDraft } from "@/modules/doctor/agents";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { validName } from "@/modules/doctor/wizard";
import { useHref, useSay, useT } from "@/modules/i18n";
import { createAgent } from "../actions";
import { InstallCommand } from "../InstallCommand";

/** O agente novo: nome, Integração e as coletas autorizadas. O token sai uma vez, com o comando
 * de instalação. */
export function NewAgentForm({ integrations }: { integrations: { id: string; label: string }[] }) {
  const t = useT();
  const say = useSay();
  const href = useHref();
  const [name, setName] = useState("");
  const [integration, setIntegration] = useState(integrations[0]?.id ?? "");
  const [draft, setDraft] = useState<CollectionDraft>({ directory: "", pattern: "*.csv", idoc: false, fn: "" });
  const [token, setToken] = useState<Schemas["RegistrationToken"] | null>(null);
  const save = useKeyedAction();
  const change = (next: Partial<CollectionDraft>) => { setDraft((current) => ({ ...current, ...next })); if (save.error) save.reset(); };
  const collections = buildCollections(draft);
  const valid = name.trim().length >= 2 && validName(name) && validPath(draft.directory) && validFunction(draft.fn) && collections.length > 0;

  if (token) {
    return (
      <div className="grid max-w-2xl gap-3">
        <InstallCommand token={token} />
        <Button asChild className="justify-self-start"><Link href={href("/doctor/connectors/agents")}>{t("site.doctor.agents.title")}</Link></Button>
      </div>
    );
  }
  return (
    <form className="grid max-w-2xl gap-4" onSubmit={(event) => {
      event.preventDefault();
      const request = { name, integration_id: integration, collections };
      save.run(async (key) => {
        const issued = await createAgent(request, key);
        if (!issued.ok) return issued.error;
        setToken(issued.value);
        return null;
      }, undefined, JSON.stringify(request));
    }}>
      <FormField label={t("site.doctor.agent.name")} htmlFor="doctor-agent-name">
        <Input id="doctor-agent-name" required minLength={2} maxLength={80} placeholder="SAP ECC Campinas" value={name} onChange={(event) => setName(event.currentTarget.value)} />
      </FormField>
      <FormField label={t("site.doctor.connector.integration")} htmlFor="doctor-agent-integration">
        <OptionSelect id="doctor-agent-integration" value={integration} onChange={setIntegration} options={integrations.map((item) => ({ value: item.id, label: item.label }))} />
      </FormField>
      <fieldset className="grid gap-3 rounded-lg border border-border/60 px-3.5 py-3">
        <legend className="px-1 text-xs text-muted-foreground">{t("site.doctor.agent.allowlist")}</legend>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <FormField label={t("site.doctor.agent.directory")} htmlFor="doctor-agent-directory" error={validPath(draft.directory) ? null : t("site.doctor.agent.directoryInvalid")}>
            <Input id="doctor-agent-directory" className="font-mono" placeholder="/exports/sap" autoCapitalize="none" spellCheck={false} value={draft.directory} onChange={(event) => change({ directory: event.currentTarget.value })} />
          </FormField>
          <FormField label={t("site.doctor.agent.pattern")} htmlFor="doctor-agent-pattern">
            <Input id="doctor-agent-pattern" className="font-mono" autoCapitalize="none" spellCheck={false} value={draft.pattern} onChange={(event) => change({ pattern: event.currentTarget.value })} />
          </FormField>
        </div>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={draft.idoc} onCheckedChange={(checked) => change({ idoc: checked === true })} />{t("site.doctor.agent.idoc")}</label>
        <FormField label={t("site.doctor.agent.function")} htmlFor="doctor-agent-function" error={validFunction(draft.fn) ? null : t("site.doctor.agent.functionInvalid")}>
          <Input id="doctor-agent-function" className="font-mono" placeholder="Z_AID_READ_SLG1" autoCapitalize="characters" spellCheck={false} value={draft.fn} onChange={(event) => change({ fn: event.currentTarget.value.toUpperCase() })} />
        </FormField>
        <p className="text-xs text-muted-foreground">{t("site.doctor.agent.allowlistHint")}</p>
      </fieldset>
      {save.error && <p role="alert" className="text-sm text-destructive">{say(save.error)}</p>}
      <div className="flex flex-wrap justify-between gap-2">
        <Button asChild variant="outline"><Link href={href("/doctor/connectors/agents")}>{t("common.cancel")}</Link></Button>
        <Button type="submit" loading={save.busy} disabled={!valid}>{t("site.doctor.agent.issue")}</Button>
      </div>
    </form>
  );
}
