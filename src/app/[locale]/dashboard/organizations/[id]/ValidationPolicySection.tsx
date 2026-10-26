"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SettingsSection, ToggleRow } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/modules/feedback";
import { useT } from "@/modules/i18n";
import { canManage } from "@/modules/organizations/rules";
import { sameValidation, withHold, withRequired, type ValidationPolicy } from "@/modules/organizations/validationPolicy";
import { saveValidationPolicy } from "../actions";
import type { OrganizationDetail } from "../data";

/** A validação dos builds para a organização inteira: quando exigida, o app
 * valida todo build dos projetos dela e guarda um ponto de volta antes; e,
 * se a organização quiser, retém `git commit` e `git push` no chat enquanto
 * a última validação falhou. Quem é member vê a tela desativada. */
export function ValidationPolicySection({ detail }: { detail: OrganizationDetail }) {
  const t = useT();
  const router = useRouter();
  const { notify, report } = useFeedback();
  const manages = canManage(detail.organization.role);
  const stored = detail.validation;
  const [policy, setPolicy] = useState<ValidationPolicy>(stored);
  const [busy, startBusy] = useTransition();

  const save = () => startBusy(async () => {
    const result = await saveValidationPolicy(detail.organization.id, policy.required, policy.holdCommits);
    if (!result.ok) {
      report(result.error);
      return;
    }
    notify(t("site.validation.saved"));
    router.refresh();
  });

  return (
    <SettingsSection title={t("site.validation.title")} description={t("site.validation.description")}>
      {!manages && <p className="text-xs text-muted-foreground">{t("policy.readOnly")}</p>}
      <div className="grid gap-3">
        <ToggleRow id="validation-required" label={t("site.validation.required")} hint={t("site.validation.required.hint")} checked={policy.required} disabled={!manages || busy} onChange={(required) => setPolicy(withRequired(policy, required))} />
        <ToggleRow id="validation-hold" label={t("site.validation.hold")} hint={t("site.validation.hold.hint")} checked={policy.holdCommits} disabled={!manages || busy} onChange={(holdCommits) => setPolicy(withHold(policy, holdCommits))} />
      </div>
      {manages && (
        <div className="flex flex-wrap items-center gap-3">
          <Button loading={busy} disabled={busy || sameValidation(policy, stored)} onClick={save}>{t("site.validation.save")}</Button>
        </div>
      )}
    </SettingsSection>
  );
}
