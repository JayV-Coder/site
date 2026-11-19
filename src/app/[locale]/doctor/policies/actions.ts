"use server";

import type { Schemas } from "@/modules/doctor/api";
import { sendToDoctor } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

/** Liga ou desliga o MFA obrigatório para todos os Papéis (#49 do jayv-doctor). */
export async function savePolicies(policies: Schemas["Policies"], key: string): Promise<Text | null> {
  return sendToDoctor("/policies", { method: "PUT", body: JSON.stringify(policies) }, {
    revalidate: "/[locale]/doctor/policies", key, known: { forbidden: "site.doctor.policies.managersOnly" },
  });
}
