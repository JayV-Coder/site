import { SUPABASE_URL } from "@/modules/supabase/config";

/** A função `mods` do Supabase: a única porta para o repositório público dos
 * mods (`JayV-Coder/jayv-coder-mods`). O site nunca lê o GitHub direto. */
export const MODS_API = `${SUPABASE_URL}/functions/v1/mods`;
