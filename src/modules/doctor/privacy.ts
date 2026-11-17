import type { Key } from "@/modules/i18n";

/** Privacidade e Subprocessadores (PRD §8, ADR-0018): quem trata os dados da Organização, por
 * perfil de IA. Os nomes das empresas ficam como são; a finalidade e a região são texto. */

export const AI_PROFILES = ["standard", "br_region", "dedicated", "local"] as const;
export const aiProfileKey = (profile: string): Key => ((AI_PROFILES as readonly string[]).includes(profile) ? `site.doctor.privacy.profile.${profile}` : "site.doctor.privacy.profile.standard") as Key;

export type Subprocessor = { name: string; purpose: Key; region: Key };

const BASE: Subprocessor[] = [
  { name: "Supabase", purpose: "site.doctor.subprocessors.purpose.supabase", region: "site.doctor.subprocessors.region.supabase" },
  { name: "Google Cloud", purpose: "site.doctor.subprocessors.purpose.gcp", region: "site.doctor.subprocessors.region.brazil" },
];

/** Os subprocessadores que valem para o perfil de IA; no modo local, nenhum de IA recebe nada. */
export function subprocessors(profile: string): Subprocessor[] {
  if (profile === "local") return BASE;
  if (profile !== "standard") {
    return [...BASE, {
      name: "Google Vertex AI",
      purpose: profile === "dedicated" ? "site.doctor.subprocessors.purpose.vertexDedicated" : "site.doctor.subprocessors.purpose.vertex",
      region: "site.doctor.subprocessors.region.brazil",
    }];
  }
  return [
    ...BASE,
    { name: "Anthropic", purpose: "site.doctor.subprocessors.purpose.anthropic", region: "site.doctor.subprocessors.region.us" },
    { name: "Voyage AI", purpose: "site.doctor.subprocessors.purpose.voyage", region: "site.doctor.subprocessors.region.us" },
  ];
}

/** O que o DPA diz sobre a IA em cada perfil. */
export function dpaKey(profile: string): Key {
  if (profile === "local") return "site.doctor.subprocessors.dpa.local";
  return profile === "standard" ? "site.doctor.subprocessors.dpa.standard" : "site.doctor.subprocessors.dpa.brazil";
}
