"use client";

import { useState } from "react";
import { ConfirmAction, FormField, OptionSelect, ToggleRow } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Schemas } from "@/modules/doctor/api";
import { roleKey } from "@/modules/doctor/labels";
import { SSO_ROLES, validMetadataUrl, type SsoRole } from "@/modules/doctor/sso";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT, type Key } from "@/modules/i18n";
import { disableSso, saveConnection } from "./actions";

type Connection = Schemas["SsoConnection"];

export function ConnectionForm({ connection, canRequire }: { connection: Connection | null; canRequire: boolean }) {
  const t = useT();
  const say = useSay();
  const save = useKeyedAction();
  const drop = useKeyedAction();
  const [metadata, setMetadata] = useState(connection?.metadata_url ?? "");
  const [requireSso, setRequireSso] = useState(connection?.require_sso ?? false);
  const [role, setRole] = useState<SsoRole | "none">(connection?.default_role ?? "none");
  const [saved, setSaved] = useState(false);
  const url = metadata.trim();
  const urlError = url && !validMetadataUrl(url) ? t("site.doctor.sso.error.metadata") : null;
  const touch = () => { setSaved(false); save.reset(); };

  const submit = () => {
    if (!url || urlError) return;
    const config = { metadata_url: url, require_sso: canRequire && requireSso, default_role: role === "none" ? null : role };
    save.run((key) => saveConnection(config, key), () => setSaved(true), JSON.stringify(config));
  };

  return (
    <section aria-labelledby="doctor-sso-connection" className="grid gap-3">
      <h2 id="doctor-sso-connection" className="text-sm font-medium text-muted-foreground">{t("site.doctor.sso.connection")}</h2>
      <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
        <FormField label={t("site.doctor.sso.metadata")} htmlFor="doctor-sso-metadata" hint={t("site.doctor.sso.metadataHint")} error={urlError}>
          <Input id="doctor-sso-metadata" type="url" inputMode="url" autoCapitalize="none" spellCheck={false} required value={metadata} placeholder="https://"
            onChange={(event) => { touch(); setMetadata(event.currentTarget.value); }} />
        </FormField>
        <ToggleRow id="doctor-sso-require" label={t("site.doctor.sso.require")} hint={t(canRequire ? "site.doctor.sso.requireHint" : "site.doctor.sso.requireNeedsDomain")}
          checked={canRequire && requireSso} disabled={!canRequire} onChange={(value) => { touch(); setRequireSso(value); }} />
        <FormField label={t("site.doctor.sso.defaultRole")} htmlFor="doctor-sso-role" hint={t("site.doctor.sso.defaultRoleHint")}>
          <OptionSelect id="doctor-sso-role" value={role} onChange={(value) => { touch(); setRole(value); }}
            options={[{ value: "none" as const, label: t("site.doctor.sso.noDefaultRole") }, ...SSO_ROLES.map((value) => ({ value, label: t(roleKey(value) as Key) }))]} />
        </FormField>
        {save.error && <p role="alert" className="text-sm text-destructive">{say(save.error)}</p>}
        {saved && <p role="status" className="text-sm text-success">{t("site.doctor.sso.saved")}</p>}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Button type="submit" loading={save.busy} disabled={!url || Boolean(urlError)}>{t(connection ? "site.doctor.sso.save" : "site.doctor.sso.enable")}</Button>
          {connection && (
            <ConfirmAction title={t("site.doctor.sso.disableTitle")} description={t("site.doctor.sso.disableBody")} confirm={t("site.doctor.sso.disable")}
              onConfirm={() => drop.run((key) => disableSso(key))}>
              <Button type="button" variant="outline" loading={drop.busy}>{t("site.doctor.sso.disable")}</Button>
            </ConfirmAction>
          )}
        </div>
        {drop.error && <p role="alert" className="text-sm text-destructive">{say(drop.error)}</p>}
      </form>
    </section>
  );
}
