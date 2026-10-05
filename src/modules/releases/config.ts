import { SUPABASE_URL } from "@/modules/supabase/config";

/** A função `releases` do Supabase: a única porta para o repositório público
 * de releases do app. O site nunca fala com o GitHub direto — versões,
 * instaladores, changelog e documentação passam todos por ela. */
export const RELEASES_API = `${SUPABASE_URL}/functions/v1/releases`;
