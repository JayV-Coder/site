"use server";

import { sendForResult, type Result } from "@/modules/doctor/send";
import type { Schemas } from "@/modules/doctor/api";

const KNOWN = { hmac_unavailable: "site.doctor.subject.error.hmacUnavailable" };

/** A Referência vai no corpo; a API calcula o HMAC e o número não chega ao banco nem aos logs. */
export async function findSubject(reference: string): Promise<Result<Schemas["SubjectEvents"]>> {
  return sendForResult("/privacy/subject/search", { method: "POST", body: JSON.stringify({ reference: reference.trim() }) }, { known: KNOWN });
}

export async function eraseSubject(reference: string, key: string): Promise<Result<Schemas["SubjectErased"]>> {
  return sendForResult("/privacy/subject/erase", { method: "POST", body: JSON.stringify({ reference: reference.trim() }) }, { known: KNOWN, key });
}
