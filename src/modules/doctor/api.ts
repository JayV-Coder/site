import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/auth";
import type { components } from "./contracts.gen";
import { readOr } from "./read";

/** O Integration AI Doctor (JayV-Coder/jayv-doctor) dentro do site: as telas gravam pela API
 * dele, com o token do Supabase de quem entrou; a API confere o JWT, a Organização ativa
 * (claim do hook) e o Papel, e o banco aplica o RLS. As leituras de `doctor_read` vão direto ao
 * Supabase (`read.ts`, ADR-0026), e o Realtime usa o mesmo token no navegador
 * (`LiveRefresh`). */
export const DOCTOR_API_URL = (process.env.DOCTOR_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export type Schemas = components["schemas"];
export type Me = Schemas["Me"];
export type Organization = Schemas["Organization"];

/** O IP do navegador (último salto, posto pelo balanceador) e o user agent seguem para a
 * Trilha de auditoria do Doctor, que confia em `AID_TRUSTED_PROXY_HOPS` saltos. */
async function clientHeaders(): Promise<Record<string, string>> {
  try {
    const incoming = await headers();
    const hops = (incoming.get("x-forwarded-for") ?? "").split(",").map((hop) => hop.trim()).filter(Boolean);
    const agent = incoming.get("user-agent");
    return {
      ...(hops.length > 0 && { "x-forwarded-for": hops[hops.length - 1] ?? "" }),
      ...(agent && { "user-agent": agent }),
    };
  } catch {
    return {};
  }
}

/** Sem sessão: as portas anônimas da API (o link compartilhado do Relatório). Leva o IP de quem
 * pediu, para o limite por IP e a Trilha de auditoria da Organização dona; os headers de quem
 * chama entram. */
export async function doctorPublicFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${DOCTOR_API_URL}/api/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", ...(await clientHeaders()), ...Object.fromEntries(new Headers(init.headers)) },
  });
}

/** Chamada à API do Doctor (`/api/v1` + `path`). A autorização é sempre a da sessão;
 * os headers de quem chama (ex.: `Idempotency-Key`) entram. */
export async function doctorFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const session = await auth();
  return doctorPublicFetch(path, {
    ...init,
    headers: { ...Object.fromEntries(new Headers(init.headers)), authorization: `Bearer ${session?.accessToken ?? ""}` },
  });
}

/** O recurso, `"not_found"` quando não existe nesta Organização, ou `null` quando a API
 * não respondeu (aí a tela não pode dizer que não há dados). */
export async function doctorGet<T>(path: string): Promise<T | "not_found" | null> {
  const response = await doctorFetch(path).catch(() => null);
  if (response?.status === 404 || response?.status === 422) return "not_found";
  return response?.ok ? ((await response.json()) as T) : null;
}

/** Para rotas que respondem `null` quando não há o recurso (a conexão com o ITSM, por exemplo):
 * separa "não há" (`ok: true, value: null`) de "a API não respondeu" (`ok: false`). */
export async function doctorMaybe<T>(path: string): Promise<{ ok: true; value: T | null } | { ok: false }> {
  const response = await doctorFetch(path).catch(() => null);
  if (!response?.ok) return { ok: false };
  return { ok: true, value: (await response.json().catch(() => null)) as T | null };
}

/** Lista ou objeto sem o caso "não existe": `null` quando a API não respondeu ou recusou. */
export async function doctorList<T>(path: string): Promise<T | null> {
  const response = await doctorFetch(path).catch(() => null);
  return response?.ok ? ((await response.json()) as T) : null;
}

/** Busca no corpo (POST): o termo pode ser um nº de pedido e não vai para a URL nem log. */
export async function doctorSearch<T>(path: string, body: unknown): Promise<T | null> {
  const response = await doctorFetch(path, { method: "POST", body: JSON.stringify(body) }).catch(() => null);
  return response?.ok ? ((await response.json()) as T) : null;
}

/** Quem entrou, as Organizações do Doctor e a ativa; `cache`: o layout e a página pedem o
 * mesmo `/me` na mesma requisição. Direto no Supabase (`doctor_read.me`, ADR-0026); sem ele,
 * pela API. */
export const getMe = cache(async (): Promise<Me | null> => readOr<Me>("me", {}, () => doctorList<Me>("/me")));
