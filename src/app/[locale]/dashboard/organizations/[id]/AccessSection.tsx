"use client";

import { useMemo, useState } from "react";
import { BanIcon, CheckIcon, CircleAlertIcon, LockIcon } from "lucide-react";
import { EmptyText } from "@/components/atoms";
import { FormField, OptionSelect, SettingsSection } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { useT, type Key } from "@/modules/i18n";
import { accessOf, type AccessLine, type AccessState } from "@/modules/organizations/access";
import type { OrganizationDetail } from "../data";

const STATE_ICON: Record<AccessState, typeof CheckIcon> = { allowed: CheckIcon, limited: CircleAlertIcon, blocked: BanIcon, required: LockIcon };
const STATE_TONE: Record<AccessState, string> = { allowed: "text-success", limited: "text-warning", blocked: "text-destructive", required: "text-primary" };

/** "O que esta pessoa pode fazer, e por quê": escolhe um membro e mostra, numa
 * tela só, o papel, o plano, a política de LLM, as permissões do chat, os
 * comandos bloqueados e a validação, cada linha com a regra que decide. Só
 * para owner e maintainer. */
export function AccessSection({ detail }: { detail: OrganizationDetail }) {
  const t = useT();
  const [chosen, setChosen] = useState(detail.members[0]?.userId ?? "");
  const member = detail.members.find((item) => item.userId === chosen) ?? null;
  const plan = detail.memberPlans?.members.find((item) => item.userId === chosen) ?? null;
  const areas = useMemo(() => (member ? accessOf({
    role: member.role, plan, off: detail.memberPlans?.off ?? [], policies: detail.policies, commandRules: detail.commandRules,
    chatBlocked: detail.chatBlocked, chatEnabled: detail.chatEnabled, validation: detail.validation,
  }) : []), [member, plan, detail]);

  const say = (line: AccessLine) => {
    const item = t(line.item as Key, line.params);
    const reason = t(line.reason as Key, line.reasonParams ? { ...line.reasonParams, role: line.reasonParams.role ? t(`org.role.${line.reasonParams.role}` as Key) : "" } : undefined);
    return { item, reason };
  };

  return (
    <SettingsSection title={t("site.access.title")} description={t("site.access.description")}>
      {detail.members.length === 0 ? <EmptyText>{t("site.access.empty")}</EmptyText> : (
        <div className="grid gap-5">
          <div className="grid max-w-sm gap-1">
            <FormField label={t("site.access.member")} htmlFor="access-member">
              <OptionSelect id="access-member" value={chosen}
                options={detail.members.map((item) => ({ value: item.userId, label: `${item.displayName} (@${item.username})` }))}
                onChange={setChosen} />
            </FormField>
            {plan && <p className="text-xs text-muted-foreground">{plan.admin ? t("site.access.planAdmin", { plan: plan.planName }) : t("site.access.plan", { plan: plan.planName })}</p>}
            {!detail.memberPlans && <p className="text-xs text-muted-foreground">{t("site.access.planUnavailable")}</p>}
          </div>
          {areas.map((area) => (
            <section key={area.id} aria-labelledby={`access-${area.id}`} className="grid gap-2">
              <h4 id={`access-${area.id}`} className="text-sm font-semibold">{t(`site.access.area.${area.id}` as Key)}</h4>
              <ul className="grid gap-1.5">
                {area.lines.map((line) => {
                  const Icon = STATE_ICON[line.state];
                  const { item, reason } = say(line);
                  return (
                    <li key={line.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2.5 rounded-md border border-border/60 px-3 py-2 @xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
                      <Icon aria-hidden="true" className={`mt-0.5 size-4 ${STATE_TONE[line.state]}`} />
                      <span className="text-sm">
                        {item} <Badge variant="outline" className="ms-1 align-middle">{t(`site.access.state.${line.state}` as Key)}</Badge>
                      </span>
                      <span className="col-start-2 text-xs text-muted-foreground @xl:col-start-3">{reason}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
