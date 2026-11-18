"use server";

import type { Schemas } from "@/modules/doctor/api";
import { sendToDoctor } from "@/modules/doctor/send";
import type { Text } from "@/modules/i18n/types";

const PAGE = "/[locale]/doctor/privacy/sanitization";

/** Troca as regras inteiras (PUT). Valem para os Eventos que chegarem daqui em diante. */
export async function saveSanitization(rules: Schemas["SanitizationRules"], key: string): Promise<Text | null> {
  return sendToDoctor("/privacy/sanitization", { method: "PUT", body: JSON.stringify(rules) }, {
    revalidate: PAGE, key, invalid: "site.doctor.sanitization.error.rejected",
  });
}
