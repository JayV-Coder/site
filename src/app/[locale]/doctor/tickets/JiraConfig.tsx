"use client";

import { useState, useTransition } from "react";
import { ConfirmAction, FormField, OptionSelect, ToggleRow } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Schemas } from "@/modules/doctor/api";
import { fieldsText, parseFields, PRIORITY_DEFAULTS, validProjectKey } from "@/modules/doctor/itsm";
import { SEVERITIES, severityKey } from "@/modules/doctor/labels";
import { OFFLINE, useKeyedAction } from "@/modules/doctor/useKeyedAction";
import type { Key } from "@/modules/i18n";
import { useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { configureJira, connectJira, disconnectJira } from "./actions";

/** Conectar leva ao consentimento do Atlassian. */
export function ConnectJira({ again }: { again: boolean }) {
  const t = useT();
  const say = useSay();
  const [error, setError] = useState<Text | null>(null);
  const [busy, startBusy] = useTransition();
  return (
    <div className="grid justify-items-start gap-2">
      <Button loading={busy} onClick={() => startBusy(async () => setError(await connectJira().catch(() => OFFLINE)))}>
        {t(again ? "site.doctor.itsm.reconnectJira" : "site.doctor.itsm.connectJira")}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
    </div>
  );
}

/** Desconectar com confirmação; também quando a autorização venceu (sem o formulário). */
export function DisconnectJira() {
  const t = useT();
  const say = useSay();
  const drop = useKeyedAction();
  return (
    <div className="grid gap-1">
      <ConfirmAction title={t("site.doctor.itsm.disconnectTitle", { provider: "Jira" })} description={t("site.doctor.itsm.disconnectBody")}
        confirm={t("site.doctor.itsm.disconnect")} onConfirm={() => drop.run((key) => disconnectJira(key))}>
        <Button type="button" variant="outline" loading={drop.busy}>{t("site.doctor.itsm.disconnect")}</Button>
      </ConfirmAction>
      {drop.error && <p role="alert" className="text-sm text-destructive">{say(drop.error)}</p>}
    </div>
  );
}

type Site = { id: string; name?: string; url?: string };

export function JiraConfig({ connection }: { connection: Schemas["JiraConnection"] }) {
  const t = useT();
  const say = useSay();
  const sites = connection.sites as Site[];
  const [draft, setDraft] = useState({
    site: connection.cloud_id ?? sites[0]?.id ?? "",
    project: connection.project_key ?? "",
    issueType: connection.issue_type ?? "",
    fields: fieldsText(connection.custom_fields),
    sync: connection.sync_status,
    priorities: { ...PRIORITY_DEFAULTS, ...connection.priority_map } as Record<string, string>,
  });
  const [saved, setSaved] = useState(false);
  const save = useKeyedAction();
  const change = (next: Partial<typeof draft>) => { setDraft((current) => ({ ...current, ...next })); setSaved(false); if (save.error) save.reset(); };
  const parsed = parseFields(draft.fields, connection.custom_fields);
  const valid = draft.site !== "" && validProjectKey(draft.project) && draft.issueType.trim() !== "" && parsed.ok;

  return (
    <form aria-label={t("site.doctor.itsm.jiraConfig")} className="grid gap-3" onSubmit={(event) => {
      event.preventDefault();
      if (!parsed.ok) return;
      const config = {
        cloud_id: draft.site, project_key: draft.project.trim().toUpperCase(), issue_type: draft.issueType.trim(), sync_status: draft.sync,
        // Sempre enviados: salvar a tela não apaga os campos que já estavam.
        custom_fields: parsed.fields,
        priority_map: Object.fromEntries(SEVERITIES.map((severity) => [severity, draft.priorities[severity]?.trim() || PRIORITY_DEFAULTS[severity]])),
      };
      save.run((key) => configureJira(config, key), () => setSaved(true), JSON.stringify(config));
    }}>
      <FormField label={t("site.doctor.itsm.site")} htmlFor="doctor-jira-site">
        <OptionSelect id="doctor-jira-site" value={draft.site} onChange={(site) => change({ site })}
          options={sites.map((site) => ({ value: site.id, label: site.name || site.url || site.id }))} />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={t("site.doctor.itsm.project")} htmlFor="doctor-jira-project" error={draft.project && !validProjectKey(draft.project) ? t("site.doctor.itsm.projectInvalid") : null}>
          <Input id="doctor-jira-project" required className="font-mono" placeholder="SUST" autoCapitalize="characters" value={draft.project} onChange={(event) => change({ project: event.currentTarget.value.toUpperCase() })} />
        </FormField>
        <FormField label={t("site.doctor.itsm.issueType")} htmlFor="doctor-jira-type">
          <Input id="doctor-jira-type" required placeholder="Incident" value={draft.issueType} onChange={(event) => change({ issueType: event.currentTarget.value })} />
        </FormField>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xs text-muted-foreground">{t("site.doctor.itsm.priorities")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {SEVERITIES.map((severity) => (
            <FormField key={severity} label={t(severityKey(severity) as Key)} htmlFor={`doctor-jira-priority-${severity}`}>
              <Input id={`doctor-jira-priority-${severity}`} value={draft.priorities[severity] ?? ""} placeholder={PRIORITY_DEFAULTS[severity]}
                onChange={(event) => change({ priorities: { ...draft.priorities, [severity]: event.currentTarget.value } })} />
            </FormField>
          ))}
        </div>
      </fieldset>
      <FormField label={t("site.doctor.itsm.fields")} htmlFor="doctor-jira-fields"
        error={parsed.ok ? null : t("site.doctor.itsm.fieldsInvalid", { line: parsed.line })} hint={t("site.doctor.itsm.fieldsHint")}>
        <Textarea id="doctor-jira-fields" rows={2} spellCheck={false} className="font-mono text-xs" placeholder="customfield_10010=Sustentação"
          value={draft.fields} onChange={(event) => change({ fields: event.currentTarget.value })} />
      </FormField>
      <ToggleRow id="doctor-jira-sync" label={t("site.doctor.itsm.jiraSync")} checked={draft.sync} onChange={(sync) => change({ sync })} />
      <p className="text-xs text-muted-foreground">{t("site.doctor.itsm.jiraContent")}</p>
      {save.error && <p role="alert" className="text-sm text-destructive">{say(save.error)}</p>}
      {saved && <p role="status" className="text-sm text-success">{t("site.doctor.itsm.saved")}</p>}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DisconnectJira />
        <Button type="submit" loading={save.busy} disabled={!valid}>{t("site.doctor.connector.save")}</Button>
      </div>
    </form>
  );
}
