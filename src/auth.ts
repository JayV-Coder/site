import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { SUPABASE_KEY, SUPABASE_URL } from "@/modules/supabase/config";
import { decodeClaims, displayName, avatarUrl, needsMoreAssurance, type SupabaseUser } from "@/modules/auth/session";

declare module "next-auth" {
  interface User { accessToken?: string; refreshToken?: string; expiresAt?: number }
  interface Session {
    /** O token do Supabase de quem entrou, para as consultas do servidor
     * respeitarem o RLS (e o `is_admin()`) como no app. */
    accessToken?: string;
    /** O Supabase recusou renovar a sessão: é preciso entrar de novo. */
    error?: "refresh";
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT { accessToken?: string; refreshToken?: string; expiresAt?: number; error?: "refresh" }
}

/** Renova um pouco antes do fim, para nenhuma consulta sair com o token
 * vencendo no caminho. */
const EARLY = 60;

async function supabaseAuth(path: string, init: RequestInit & { token?: string }) {
  const headers: Record<string, string> = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  return fetch(`${SUPABASE_URL}/auth/v1/${path}`, { ...init, headers, cache: "no-store" });
}

/** O login acontece no navegador, pelo Supabase Auth (senha, GitHub, GitLab,
 * Bitbucket, segundo fator), igual ao app. O NextAuth recebe os tokens já
 * prontos, confere com o Supabase quem é a pessoa e passa a guardar a sessão
 * num cookie cifrado. Os usuários são os mesmos do app. */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      id: "supabase",
      name: "Supabase",
      credentials: { accessToken: {}, refreshToken: {} },
      async authorize(credentials) {
        const accessToken = typeof credentials?.accessToken === "string" ? credentials.accessToken : "";
        const refreshToken = typeof credentials?.refreshToken === "string" ? credentials.refreshToken : "";
        if (!accessToken || !refreshToken) return null;
        const response = await supabaseAuth("user", { token: accessToken });
        if (!response.ok) return null;
        const user = (await response.json()) as SupabaseUser;
        const claims = decodeClaims(accessToken);
        // Com o app autenticador cadastrado, a senha sozinha não abre o site,
        // como não abre o app nem o banco (migração `second_factor`).
        if (!claims || needsMoreAssurance(user, claims)) return null;
        return { id: user.id, email: user.email ?? null, name: displayName(user), image: avatarUrl(user), accessToken, refreshToken, expiresAt: claims.exp };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return { ...token, accessToken: user.accessToken, refreshToken: user.refreshToken, expiresAt: user.expiresAt, error: undefined };
      }
      if (!token.refreshToken || token.error) return token;
      if (token.expiresAt && Date.now() / 1000 < token.expiresAt - EARLY) return token;
      const response = await supabaseAuth("token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: token.refreshToken }) });
      if (!response.ok) return { ...token, error: "refresh" as const };
      const fresh = (await response.json()) as { access_token: string; refresh_token: string; expires_at?: number };
      return {
        ...token,
        accessToken: fresh.access_token,
        refreshToken: fresh.refresh_token,
        expiresAt: fresh.expires_at ?? decodeClaims(fresh.access_token)?.exp,
        error: undefined,
      };
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.accessToken = token.error ? undefined : token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  events: {
    // Sair do site encerra a sessão no Supabase também (só esta: o app em
    // outra máquina continua aberto).
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      if (token?.accessToken) await supabaseAuth("logout?scope=local", { method: "POST", token: token.accessToken }).catch(() => {});
    },
  },
});
