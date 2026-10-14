import "server-only";
import { SUPABASE_KEY, SUPABASE_URL } from "@/modules/supabase/config";
import { isFeature, type FeatureKey } from "./catalog";

export interface PublicPlan {
  key: string;
  name: string;
  description: string;
  isDefault: boolean;
  priceCents: number | null;
  currency: string | null;
  interval: "month" | "year" | null;
  /** As moedas em que o plano é vendido (a padrão primeiro); vazio no gratuito. */
  currencies: string[];
  /** Os recursos do plano que o site sabe descrever, sem o núcleo (que vem em
   * todo plano e tem uma frase só). */
  features: FeatureKey[];
}

type Row = Omit<PublicPlan, "features"> & { features: { key: string; core: boolean }[] };

/** Os planos à venda, para a página pública: a RPC `public_plans` responde
 * sem login, com o preço na moeda pedida ou na do país de quem olha. Sem rede
 * ou sem a RPC (banco antes da migração), nulo. */
export async function publicPlans(country?: string | null, currency?: string | null): Promise<PublicPlan[] | null> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_plans`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ country: country || null, wanted: currency || null }),
      next: { revalidate: 300, tags: ["plans"] },
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as Row[];
    return rows.map((row) => ({ ...row, currencies: row.currencies ?? [], features: row.features.filter((feature) => !feature.core && isFeature(feature.key)).map((feature) => feature.key as FeatureKey) }));
  } catch (error) {
    console.error("plans", error);
    return null;
  }
}
