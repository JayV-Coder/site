import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import type { GitProvider } from "./providers";

/** Cifra (AES-256-GCM) o que vai nos cookies do provedor git: só o servidor
 * lê, e um cookie mexido ou de outro segredo vira nulo. A chave sai do
 * `AUTH_SECRET` do NextAuth, separada por finalidade. */
const keyOf = (secret: string, purpose: string) => Buffer.from(hkdfSync("sha256", secret, "jayv.git", purpose, 32));

export function seal(value: unknown, secret: string, purpose: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyOf(secret, purpose), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function unseal<T>(sealed: string | undefined, secret: string, purpose: string): T | null {
  if (!sealed) return null;
  try {
    const raw = Buffer.from(sealed, "base64url");
    if (raw.length <= 28) return null;
    const decipher = createDecipheriv("aes-256-gcm", keyOf(secret, purpose), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8")) as T;
  } catch {
    return null;
  }
}

export const sameText = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const randomText = (bytes: number) => randomBytes(bytes).toString("base64url");

/** O que fica no cookie enquanto o provedor está aberto: o `state` que volta
 * na URL, o verificador do PKCE e para onde voltar. */
export interface GitState {
  state: string;
  verifier: string | null;
  provider: GitProvider;
  org: string;
  locale: string;
  user: string;
  redirectUri: string;
  /** Abrir a lista do provedor ao voltar. */
  pick: boolean;
}

/** Os tokens do owner, um por organização e provedor (`<org>:<provedor>`):
 * cada organização usa a conta que foi conectada nela, sem trocar a das
 * outras. Vivem só no cookie cifrado (uma hora), nunca no banco: servem para
 * listar e conferir os repositórios na hora de associar. */
export interface GitTokens {
  user: string;
  tokens: Record<string, { token: string; account: string; expiresAt: number }>;
}

/** Quantos tokens o cookie guarda: os mais velhos saem primeiro, para ele não
 * passar do tamanho que o navegador aceita. */
export const JAR_MAX = 12;

const slot = (org: string, provider: GitProvider) => `${org}:${provider}`;

/** O token desta organização e provedor, se for de quem entrou e ainda valer. */
export function tokenOf(jar: GitTokens | null, user: string, org: string, provider: GitProvider, now = Date.now()) {
  const entry = jar && jar.user === user ? jar.tokens?.[slot(org, provider)] : undefined;
  return entry && entry.expiresAt > now ? entry : null;
}

/** O pote com este token; o de outra pessoa (mesmo navegador) é descartado,
 * os vencidos saem e, cheio, sai o mais antigo. */
export function withToken(jar: GitTokens | null, user: string, org: string, provider: GitProvider, entry: GitTokens["tokens"][string] | null, now = Date.now()): GitTokens {
  const kept = Object.entries(jar && jar.user === user ? jar.tokens ?? {} : {})
    .filter(([key, value]) => key !== slot(org, provider) && key.includes(":") && value.expiresAt > now)
    .sort(([, a], [, b]) => b.expiresAt - a.expiresAt)
    .slice(0, entry ? JAR_MAX - 1 : JAR_MAX);
  const tokens = Object.fromEntries(kept);
  if (entry) tokens[slot(org, provider)] = entry;
  return { user, tokens };
}
