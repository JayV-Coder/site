"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { coderRoleKey, initials } from "@/modules/doctor/labels";
import type { AvailableOrganization } from "@/modules/doctor/organizations";
import { useHref, useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { enableOrganization } from "./actions";
import { DoctorSettingsFields, useDoctorSettings } from "./DoctorSettings";

/** As Organizações da pessoa no jayv-coder que ainda não usam o Doctor. O owner de lá ativa ali
 * mesmo, só com o que é do Doctor; os outros veem que depende do owner. */
export function AvailableOrganizations({ activatable, waiting }: { activatable: AvailableOrganization[]; waiting: AvailableOrganization[] }) {
  return (
    <ul className="grid gap-2">
      {activatable.map((organization) => <li key={organization.id}><Activatable organization={organization} /></li>)}
      {waiting.map((organization) => <li key={organization.id}><Waiting organization={organization} /></li>)}
    </ul>
  );
}

function Heading({ organization }: { organization: AvailableOrganization }) {
  const t = useT();
  const role = coderRoleKey(organization.coder_role);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="grid size-9 flex-none place-items-center rounded-md bg-secondary text-xs font-semibold">{initials(organization.name)}</span>
      <span className="grid min-w-0 flex-1">
        <strong className="truncate text-sm font-medium">{organization.name}</strong>
        <span className="truncate font-mono text-xs text-muted-foreground">@{organization.slug}</span>
      </span>
      <Badge variant="outline">{role ? t(role) : organization.coder_role}</Badge>
    </div>
  );
}

function Activatable({ organization }: { organization: AvailableOrganization }) {
  const t = useT();
  const say = useSay();
  const href = useHref();
  const [open, setOpen] = useState(false);
  const doctor = useDoctorSettings();
  const [error, setError] = useState<Text | null>(null);
  const [busy, startBusy] = useTransition();
  const formId = `doctor-enable-${organization.id}`;
  const toggle = useRef<HTMLButtonElement>(null);
  const opened = useRef(false);

  // Abrir leva o foco ao primeiro campo; fechar o devolve ao botão (o formulário some da página).
  useEffect(() => {
    if (open) document.getElementById(`${formId}-segment`)?.focus();
    else if (opened.current) toggle.current?.focus();
    opened.current = open;
  }, [open, formId]);

  const close = () => { setError(null); setOpen(false); };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const settings = doctor.settings;
    if (settings === null) return;
    startBusy(async () => {
      const failed = await enableOrganization(organization.id, settings).catch((): Text => ({ key: "site.doctor.error.offline" }));
      setError(failed);
      if (failed === null) window.location.assign(href("/doctor"));
    });
  };

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <Heading organization={organization} />
      {!open ? (
        <div><Button ref={toggle} type="button" variant="outline" aria-expanded={false} onClick={() => setOpen(true)}>{t("site.doctor.org.enable")}</Button></div>
      ) : (
        <form id={formId} onSubmit={submit} className="grid gap-4 border-t border-border pt-3">
          <DoctorSettingsFields id={formId} state={doctor} />
          {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={busy} disabled={doctor.settings === null}>{t("site.doctor.org.enable")}</Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={close}>{t("common.cancel")}</Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Waiting({ organization }: { organization: AvailableOrganization }) {
  const t = useT();
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-card px-4 py-3">
      <Heading organization={organization} />
      <p className="text-xs text-muted-foreground">{t("site.doctor.org.ownerOnly")}</p>
    </div>
  );
}
