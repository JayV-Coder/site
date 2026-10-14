"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormField, OptionSelect, SettingsSection } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/modules/feedback";
import { useT } from "@/modules/i18n";
import { CHAT_KINDS, chatLists, chatStates, type ChatKind, type ChatState } from "@/modules/organizations/chatPermissions";
import { canManage } from "@/modules/organizations/rules";
import { saveChatPermissions } from "../actions";
import type { OrganizationDetail } from "../data";

const STATES: ChatState[] = ["free", "on", "blocked"];

/** As permissões do seletor do chat no app (rodar comandos, Git, rede), cada
 * uma livre (a pessoa liga), sempre ligada ou bloqueada nos projetos da
 * organização. A bloqueada fica "Bloqueado por <organização>" no app e o
 * agente nunca a recebe; a sempre ligada já vem ligada. Vale para a
 * organização inteira e fica em cima da aba Permissões, junto dos comandos
 * bloqueados. Quem é member vê a tela desativada. */
export function ChatPermissionsSection({ detail }: { detail: OrganizationDetail }) {
  const t = useT();
  const router = useRouter();
  const { notify, report } = useFeedback();
  const manages = canManage(detail.organization.role);
  const stored = chatStates(detail.chatBlocked, detail.chatEnabled);
  const [states, setStates] = useState<Record<ChatKind, ChatState>>(stored);
  const [busy, startBusy] = useTransition();
  const changed = CHAT_KINDS.some((kind) => states[kind] !== stored[kind]);
  const options = STATES.map((value) => ({ value, label: t(`site.chatperm.state.${value}`) }));

  const save = () => startBusy(async () => {
    const { blocked, enabled } = chatLists(states);
    const result = await saveChatPermissions(detail.organization.id, blocked, enabled);
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
      <fieldset disabled={!manages || busy} className="grid gap-3 @xl:grid-cols-3">
        {CHAT_KINDS.map((kind) => (
          <FormField key={kind} label={t(`site.chatperm.${kind}`)} htmlFor={`chat-perm-${kind}`} hint={t(`site.chatperm.${kind}.hint`)}>
            <OptionSelect id={`chat-perm-${kind}`} value={states[kind]} options={options} disabled={!manages || busy} onChange={(value) => setStates((current) => ({ ...current, [kind]: value }))} />
          </FormField>
        ))}
      </fieldset>
      {manages && (
        <div className="flex flex-wrap items-center gap-3">
          <Button loading={busy} disabled={busy || !changed} onClick={save}>{t("site.chatperm.save")}</Button>
        </div>
      )}
    </SettingsSection>
  );
}
