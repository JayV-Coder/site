"use client";

import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Schemas } from "@/modules/doctor/api";
import { useT } from "@/modules/i18n";
import { updateIntegration } from "./actions";
import { IntegrationDialog } from "./IntegrationDialog";

/** Editar a Integração (Owner e Admin com MFA): os mesmos campos de criar, já preenchidos. */
export function EditIntegration({ integration }: { integration: Schemas["Integration"] }) {
  const t = useT();
  const initial = {
    name: integration.name, source_system: integration.source_system, target_system: integration.target_system,
    environment: integration.environment, owner_team: integration.owner_team ?? "", description: integration.description ?? "",
  };
  return (
    <IntegrationDialog id={`doctor-integration-${integration.id}-edit`} title={t("site.doctor.integrations.editTitle", { name: integration.name })}
      initial={initial} submit={(draft, key) => updateIntegration(integration.id, draft, initial, key)}
      trigger={<Button variant="outline" size="sm" aria-label={t("site.doctor.integrations.editTitle", { name: integration.name })}><PencilIcon />{t("site.doctor.integrations.edit")}</Button>} />
  );
}
