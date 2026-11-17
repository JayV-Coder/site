"use client";

import { useState } from "react";
import { ConfirmAction, FormField, ToggleRow } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { Schemas } from "@/modules/doctor/api";
import { systemName, SYSTEMS } from "@/modules/doctor/diagnosis";
import { normalizeInstance, validInstance } from "@/modules/doctor/itsm";
import { nameOf } from "@/modules/doctor/labels";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { CopyCommand } from "../connectors/new/WizardParts";
import { configureServiceNow, disconnectServiceNow } from "./actions";

/** ServiceNow (#44): instância, app OAuth (client credentials) e o grupo por Sistema responsável.
 * O secret vai para o cofre e não volta; o endereço da Business Rule aparece uma vez. */
export function ServiceNowConfig({ connection }: { connection: Schemas["ServiceNowConnection"] | null }) {
  const t = useT();
  const say = useSay();
  const [draft, setDraft] = useState({
    instance: connection?.instance_url ?? "", clientId: connection?.client_id ?? "", secret: "",
    groups: { ...(connection?.assignment_groups ?? {}) } as Record<string, string>, defaultGroup: connection?.default_group ?? "",
    sync: connection?.sync_status ?? true, rotate: false,
  });
  const [hookUrl, setHookUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const save = useKeyedAction();
  const drop = useKeyedAction();
  const change = (next: Partial<typeof draft>) => { setDraft((current) => ({ ...current, ...next })); setSaved(false); if (save.error) save.reset(); };
  const valid = validInstance(draft.instance) && draft.clientId.trim() !== "" && (connection !== null || draft.secret.trim() !== "");

  return (
    <form aria-label={t("site.doctor.itsm.serviceNowConfig")} className="grid gap-3" onSubmit={(event) => {
      event.preventDefault();
      const config = {
        instance_url: normalizeInstance(draft.instance), client_id: draft.clientId.trim(),
        // Em branco mantém o secret que já está no cofre.
        client_secret: draft.secret.trim() || null,
        assignment_groups: Object.fromEntries(Object.entries(draft.groups).map(([system, group]) => [system, group.trim()]).filter(([, group]) => group)),
        default_group: draft.defaultGroup.trim() || null, sync_status: draft.sync, rotate_hook: draft.rotate,
        // A tela não edita os pesos de impact/urgency: os que já estão seguem como estão.
        ...(connection?.impact_map && { impact_map: connection.impact_map }),
      };
      save.run(async (key) => {
        const outcome = await configureServiceNow(config, key);
        if (!outcome.ok) return outcome.error;
        setHookUrl(outcome.value.hook_url);
        return null;
      }, () => { setSaved(true); setDraft((current) => ({ ...current, secret: "", rotate: false })); }, JSON.stringify(config));
    }}>
      <FormField label={t("site.doctor.itsm.instance")} htmlFor="doctor-sn-instance" error={draft.instance && !validInstance(draft.instance) ? t("site.doctor.itsm.instanceInvalid") : null}>
        <Input id="doctor-sn-instance" type="url" required autoCapitalize="none" spellCheck={false} placeholder="https://empresa.service-now.com" value={draft.instance} onChange={(event) => change({ instance: event.currentTarget.value })} />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={t("site.doctor.credential.clientId")} htmlFor="doctor-sn-client">
          <Input id="doctor-sn-client" required autoCapitalize="none" spellCheck={false} value={draft.clientId} onChange={(event) => change({ clientId: event.currentTarget.value })} />
        </FormField>
        <FormField label={t("site.doctor.credential.clientSecret")} htmlFor="doctor-sn-secret" hint={connection ? t("site.doctor.itsm.secretKept") : undefined}>
          <Input id="doctor-sn-secret" type="password" autoComplete="off" required={!connection} value={draft.secret} onChange={(event) => change({ secret: event.currentTarget.value })} />
        </FormField>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xs text-muted-foreground">{t("site.doctor.itsm.groups")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {SYSTEMS.map((system) => (
            <FormField key={system} label={nameOf(t, systemName(system))} htmlFor={`doctor-sn-group-${system}`}>
              <Input id={`doctor-sn-group-${system}`} value={draft.groups[system] ?? ""} onChange={(event) => change({ groups: { ...draft.groups, [system]: event.currentTarget.value } })} />
            </FormField>
          ))}
        </div>
        <FormField label={t("site.doctor.itsm.defaultGroup")} htmlFor="doctor-sn-default">
          <Input id="doctor-sn-default" placeholder="Service Desk" value={draft.defaultGroup} onChange={(event) => change({ defaultGroup: event.currentTarget.value })} />
        </FormField>
      </fieldset>
      <ToggleRow id="doctor-sn-sync" label={t("site.doctor.itsm.serviceNowSync")} checked={draft.sync} onChange={(sync) => change({ sync })} />
      {connection && (
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={draft.rotate} onCheckedChange={(checked) => change({ rotate: checked === true })} />{t("site.doctor.itsm.rotateHook")}</label>
      )}
      <p className="text-xs text-muted-foreground">{t("site.doctor.itsm.serviceNowContent")}</p>
      {hookUrl && (
        <div role="status" className="grid gap-2 rounded-md border border-border bg-secondary px-3 py-3">
          <p className="text-sm">{t("site.doctor.itsm.hookOnce")}</p>
          <CopyCommand command={hookUrl} />
        </div>
      )}
      {save.error && <p role="alert" className="text-sm text-destructive">{say(save.error)}</p>}
      {drop.error && <p role="alert" className="text-sm text-destructive">{say(drop.error)}</p>}
      {saved && !hookUrl && <p role="status" className="text-sm text-success">{t("site.doctor.itsm.saved")}</p>}
      <div className="flex flex-wrap justify-between gap-2">
        {connection && (
          <ConfirmAction title={t("site.doctor.itsm.disconnectTitle", { provider: "ServiceNow" })} description={t("site.doctor.itsm.disconnectBody")}
            confirm={t("site.doctor.itsm.disconnect")} onConfirm={() => drop.run((key) => disconnectServiceNow(key))}>
            <Button type="button" variant="outline" loading={drop.busy}>{t("site.doctor.itsm.disconnect")}</Button>
          </ConfirmAction>
        )}
        <Button type="submit" loading={save.busy} disabled={!valid}>{t(connection ? "site.doctor.connector.save" : "site.doctor.itsm.connectServiceNow")}</Button>
      </div>
    </form>
  );
}
