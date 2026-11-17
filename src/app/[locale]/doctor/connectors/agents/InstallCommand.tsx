"use client";

import type { Schemas } from "@/modules/doctor/api";
import { useT } from "@/modules/i18n";
import { CopyCommand } from "../new/WizardParts";

/** O token aparece uma vez: vale poucas horas e serve para um registro só. */
export function InstallCommand({ token }: { token: Schemas["RegistrationToken"] }) {
  const t = useT();
  return (
    <div role="status" className="grid gap-2 rounded-md border border-border bg-secondary px-3 py-3">
      <p className="text-sm">{t("site.doctor.agent.installHint", { hours: token.expires_in_hours })}</p>
      <CopyCommand command={token.install_command} />
      <p className="text-xs text-muted-foreground">{t("site.doctor.agent.outboundOnly")}</p>
    </div>
  );
}
