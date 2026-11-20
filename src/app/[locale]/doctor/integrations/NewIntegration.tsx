"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IntegrationDraft } from "@/modules/doctor/integrations";
import { useT } from "@/modules/i18n";
import { createIntegration } from "./actions";
import { IntegrationDialog } from "./IntegrationDialog";

const EMPTY: IntegrationDraft = { name: "", source_system: "salesforce", target_system: "sap", environment: "prd", owner_team: "", description: "" };

export function NewIntegration() {
  const t = useT();
  return (
    <IntegrationDialog id="doctor-integration" title={t("site.doctor.integrations.newTitle")} initial={EMPTY} submit={createIntegration}
      trigger={<Button size="sm"><PlusIcon />{t("site.doctor.integrations.new")}</Button>} />
  );
}
