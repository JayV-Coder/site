"use client";

import { useMemo, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { OptionSelect } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { roleKey } from "@/modules/doctor/labels";
import { groupRows, groupsPayload, MAX_GROUPS, SSO_ROLES, type GroupRow, type SsoRole } from "@/modules/doctor/sso";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT, type Key } from "@/modules/i18n";
import { saveGroups } from "./actions";

type Line = GroupRow & { id: number };
let nextId = 0;
const line = (row: GroupRow): Line => ({ ...row, id: (nextId += 1) });

/** Grupo do IdP → Papel no login: vale o grupo de maior Papel. Owner nunca vem do IdP. */
export function Groups({ groups }: { groups: Record<string, SsoRole> }) {
  const t = useT();
  const say = useSay();
  const save = useKeyedAction();
  const [rows, setRows] = useState<Line[]>(() => groupRows(groups).map(line));
  const [saved, setSaved] = useState(false);
  const checked = useMemo(() => groupsPayload(rows), [rows]);
  const touch = () => { setSaved(false); save.reset(); };
  const change = (id: number, patch: Partial<GroupRow>) => { touch(); setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row))); };
  const options = SSO_ROLES.map((value) => ({ value, label: t(roleKey(value) as Key) }));

  return (
    <section aria-labelledby="doctor-sso-groups" className="grid gap-3">
      <h2 id="doctor-sso-groups" className="text-sm font-medium text-muted-foreground">{t("site.doctor.sso.groups")}</h2>
      <p className="text-xs text-muted-foreground">{t("site.doctor.sso.groupsHint")}</p>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("site.doctor.sso.noGroups")}</p>}
      <ul className="grid gap-2">
        {rows.map((row, index) => {
          const problem = !checked.ok && checked.index === index ? checked.reason : null;
          return (
            <li key={row.id} className="grid gap-1">
              <div className="grid grid-cols-[minmax(0,1fr)_8.5rem_auto] items-center gap-2">
                <Input aria-label={t("site.doctor.sso.group")} aria-invalid={problem !== null} value={row.group} placeholder="AID-Admins" spellCheck={false}
                  onChange={(event) => change(row.id, { group: event.currentTarget.value })} />
                <OptionSelect label={t("site.doctor.sso.role")} value={row.role} options={options} onChange={(role) => change(row.id, { role })} />
                <Button type="button" variant="ghost" size="icon" aria-label={t("site.doctor.sso.removeGroup", { group: row.group || String(index + 1) })}
                  onClick={() => { touch(); setRows((current) => current.filter((item) => item.id !== row.id)); }}><Trash2Icon /></Button>
              </div>
              {problem && <p role="alert" className="text-xs text-destructive">{t(`site.doctor.sso.error.group.${problem}`, { max: MAX_GROUPS })}</p>}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        {rows.length < MAX_GROUPS && (
          <Button type="button" variant="outline" size="sm" onClick={() => { touch(); setRows((current) => [...current, line({ group: "", role: "viewer" })]); }}>
            <PlusIcon />{t("site.doctor.sso.addGroup")}
          </Button>
        )}
        <Button type="button" size="sm" loading={save.busy} disabled={!checked.ok}
          onClick={() => checked.ok && save.run((key) => saveGroups(checked.groups, key), () => setSaved(true), JSON.stringify(checked.groups))}>
          {t("site.doctor.sso.saveGroups")}
        </Button>
      </div>
      {save.error && <p role="alert" className="text-sm text-destructive">{say(save.error)}</p>}
      {saved && <p role="status" className="text-sm text-success">{t("site.doctor.sso.groupsSaved")}</p>}
    </section>
  );
}
