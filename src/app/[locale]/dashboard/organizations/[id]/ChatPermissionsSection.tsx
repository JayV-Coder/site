"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SettingsSection, ToggleRow } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/modules/feedback";
import { useT } from "@/modules/i18n";
import { CHAT_KINDS, type ChatKind } from "@/modules/organizations/chatPermissions";
import { canManage } from "@/modules/organizations/rules";
import { saveChatPermissions } from "../actions";
import type { OrganizationDetail } from "../data";

/** As permissões do seletor do chat no app (rodar comandos, Git, rede) que as
 * pessoas podem ligar nos projetos da organização. Cada chave ligada é uma
 * permissão que as pessoas podem usar; a desligada fica "Bloqueado por
 * <organização>" no app e o agente nunca a recebe. Vale para a organização
 * inteira. Quem é member vê a tela desativada. */
export function ChatPermissionsSection({ detail }: { detail: OrganizationDetail }) {
  const t = useT();
  const router = useRouter();
  const { notify, report } = useFeedback();
  const manages = canManage(detail.organization.role);
  const [blocked, setBlocked] = useState<ChatKind[]>(detail.chatBlocked);
  const [busy, startBusy] = useTransition();
  const changed = blocked.join("|") !== detail.chatBlocked.join("|");

  const toggle = (kind: ChatKind, allowed: boolean) => setBlocked((current) => CHAT_KINDS.filter((known) => (known === kind ? !allowed : current.includes(known))));

  const save = () => startBusy(async () => {
    const result = await saveChatPermissions(detail.organization.id, blocked);
    if (!result.ok) {
      report(result.error);
      return;
    }
    notify(t("site.chatperm.saved"));
    router.refresh();
  });

  return (
    <SettingsSection title={t("site.chatperm.title")} description={t("site.chatperm.description")}>
      {!manages && <p className="text-xs text-muted-foreground">{t("policy.readOnly")}</p>}
      <fieldset disabled={!manages || busy} className="grid gap-2.5">
        {CHAT_KINDS.map((kind) => {
          const allowed = !blocked.includes(kind);
          return (
            <ToggleRow
              key={kind}
              id={`chat-perm-${kind}`}
              label={`${t(`site.chatperm.${kind}`)} · ${t(allowed ? "site.chatperm.on" : "site.chatperm.off")}`}
              hint={t(`site.chatperm.${kind}.hint`)}
              checked={allowed}
              disabled={!manages || busy}
              onChange={(on) => toggle(kind, on)}
            />
          );
        })}
      </fieldset>
      {manages && (
        <div className="flex flex-wrap items-center gap-3">
          <Button loading={busy} disabled={busy || !changed} onClick={save}>{t("site.chatperm.save")}</Button>
          <span className="text-xs text-muted-foreground">{t("site.chatperm.count", { count: blocked.length })}</span>
        </div>
      )}
    </SettingsSection>
  );
}
