/** O mesmo projeto do Supabase do app (`src/modules/auth/client.ts` do
 * jayv-coder): mesmos usuários, mesmas traduções, mesmo papel de admin. A
 * chave publicável só identifica o projeto; a secret key nunca entra aqui. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://exvsozyemolrjbjetqww.supabase.co";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_7PeIEX0yh_svIEeNw3Gwew_lEbMVtMm";
