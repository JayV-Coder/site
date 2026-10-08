import "server-only";
import { userSupabase } from "@/modules/supabase/server";

/** Uma linha de `admin_users()`: a conta, o perfil, o acesso e o plano. */
export interface UserRow {
  userId: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  bannedUntil: string | null;
  providers: string[];
  hasPassword: boolean;
  hasMfa: boolean;
  isAdmin: boolean;
  planKey: string | null;
  subscriptionStatus: string | null;
  organizations: number;
  projects: number;
}

export const PAGE_SIZE = 50;

type Row = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" && value ? value : null);

function userRow(row: Row): UserRow {
  return {
    userId: row.user_id as string,
    email: text(row.email),
    displayName: text(row.display_name),
    username: text(row.username),
    avatarUrl: text(row.avatar_url),
    createdAt: row.created_at as string,
    lastSignInAt: text(row.last_sign_in_at),
    emailConfirmedAt: text(row.email_confirmed_at),
    bannedUntil: text(row.banned_until),
    providers: Array.isArray(row.providers) ? row.providers.map(String) : [],
    hasPassword: row.has_password === true,
    hasMfa: row.has_mfa === true,
    isAdmin: row.is_admin === true,
    planKey: text(row.plan_key),
    subscriptionStatus: text(row.subscription_status),
    organizations: Number(row.organizations ?? 0),
    projects: Number(row.projects ?? 0),
  };
}

/** A conta está bloqueada agora (`banned_until` no futuro). */
export const isBanned = (bannedUntil: string | null) => !!bannedUntil && new Date(bannedUntil).getTime() > Date.now();

/** Uma página da lista, com a busca. O banco confere se quem pede é admin. */
export async function loadUsers(search: string, page: number): Promise<{ rows: UserRow[]; total: number }> {
  const supabase = await userSupabase();
  if (!supabase) return { rows: [], total: 0 };
  const { data, error } = await supabase.rpc("admin_users", { search, page_size: PAGE_SIZE, page });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Row[];
  return { rows: rows.map(userRow), total: Number(rows[0]?.total ?? 0) };
}

export interface UserDetail {
  userId: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  bannedUntil: string | null;
  hasPassword: boolean;
  hasMfa: boolean;
  isAdmin: boolean;
  sessions: number;
  lastProvider: string;
  expertise: string | null;
  providers: { provider: string; email: string | null; createdAt: string | null }[];
  profile: Record<string, string | null> | null;
  planKey: string | null;
  subscription: { planKey: string | null; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; stripeSubscriptionId: string } | null;
  stripeCustomerId: string | null;
  organizations: { id: string; name: string; slug: string; role: string; members: number }[];
  usage: { projects: number; chats: number; calls30d: number; tokens30d: number; cost30d: number; costTotal: number };
  audit: { action: string; admin: string; createdAt: string; detail: Record<string, unknown> }[];
}

/** A conta inteira (`admin_user()`); nula quando não existe ou não é admin. */
export async function loadUser(id: string): Promise<UserDetail | null> {
  const supabase = await userSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_user", { target: id });
  if (error || !data) return null;
  const row = data as Row;
  const list = (value: unknown) => (Array.isArray(value) ? (value as Row[]) : []);
  const subscription = row.subscription as Row | null;
  const usage = (row.usage ?? {}) as Row;
  const profile = row.profile as Row | null;
  return {
    userId: row.user_id as string,
    email: text(row.email),
    createdAt: row.created_at as string,
    lastSignInAt: text(row.last_sign_in_at),
    emailConfirmedAt: text(row.email_confirmed_at),
    bannedUntil: text(row.banned_until),
    hasPassword: row.has_password === true,
    hasMfa: row.has_mfa === true,
    isAdmin: row.is_admin === true,
    sessions: Number(row.sessions ?? 0),
    lastProvider: text(row.last_provider) ?? "email",
    expertise: text(row.expertise),
    providers: list(row.providers).map((item) => ({ provider: String(item.provider), email: text(item.email), createdAt: text(item.created_at) })),
    profile: profile ? Object.fromEntries(Object.entries(profile).map(([key, value]) => [key, value === null || value === undefined ? null : String(value)])) : null,
    planKey: text(row.plan_key),
    subscription: subscription ? {
      planKey: text(subscription.plan_key), status: String(subscription.status), currentPeriodEnd: text(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end === true, stripeSubscriptionId: String(subscription.stripe_subscription_id),
    } : null,
    stripeCustomerId: text(row.stripe_customer_id),
    organizations: list(row.organizations).map((item) => ({ id: String(item.id), name: String(item.name), slug: String(item.slug), role: String(item.role), members: Number(item.members ?? 0) })),
    usage: {
      projects: Number(usage.projects ?? 0), chats: Number(usage.chats ?? 0), calls30d: Number(usage.calls_30d ?? 0),
      tokens30d: Number(usage.tokens_30d ?? 0), cost30d: Number(usage.cost_30d ?? 0), costTotal: Number(usage.cost_total ?? 0),
    },
    audit: list(row.audit).map((item) => ({ action: String(item.action), admin: String(item.admin ?? ""), createdAt: String(item.created_at), detail: (item.detail ?? {}) as Record<string, unknown> })),
  };
}

/** O que a conta tem num ambiente: o pessoal (`id` "personal") ou uma organização. */
export interface UserEnvironment { id: string; name: string | null; projects: number; chats: number; calls30d: number; tokens30d: number; cost30d: number }

/** A conta por ambiente (`admin_user_environments()`); vazia quando não é admin. */
export async function loadUserEnvironments(id: string): Promise<UserEnvironment[]> {
  const supabase = await userSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("admin_user_environments", { target: id });
  if (error || !Array.isArray(data)) return [];
  return (data as Row[]).map((row) => ({
    id: String(row.id), name: text(row.name), projects: Number(row.projects ?? 0), chats: Number(row.chats ?? 0),
    calls30d: Number(row.calls_30d ?? 0), tokens30d: Number(row.tokens_30d ?? 0), cost30d: Number(row.cost_30d ?? 0),
  }));
}
