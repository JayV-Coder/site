/** A página Dashboard do painel: o que `my_dashboard` e `admin_dashboard`
 * devolvem, já com número onde o banco manda número (o PostgREST entrega
 * `bigint` e `numeric` como texto às vezes) e lista vazia onde falta lista. */

type Row = Record<string, unknown>;

const num = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const text = (value: unknown) => (typeof value === "string" && value ? value : null);
const obj = (value: unknown): Row => (value && typeof value === "object" && !Array.isArray(value) ? value as Row : {});
const list = (value: unknown): Row[] => (Array.isArray(value) ? value.map(obj) : []);

/** Os períodos que a página oferece, em dias; 30 é o padrão. */
export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

/** O período pedido no endereço (`?days=7`), ou o padrão. */
export function periodOf(value: unknown): Period {
  const wanted = Number(Array.isArray(value) ? value[0] : value);
  return PERIODS.find((period) => period === wanted) ?? 30;
}

export type OverviewView = "me" | "system";

/** O que a página mostra: o admin abre no sistema e pode ver o próprio uso
 * (`?view=me`); as outras contas só têm o próprio. */
export function viewOf(value: unknown, admin: boolean): OverviewView {
  if (!admin) return "me";
  return (Array.isArray(value) ? value[0] : value) === "me" ? "me" : "system";
}

export interface ModelUse { model: string; calls: number; tokens: number; costUsd: number }

function models(value: unknown): ModelUse[] {
  return list(value).map((row) => ({ model: text(row.model) ?? "—", calls: num(row.calls), tokens: num(row.tokens), costUsd: num(row.cost_usd) }));
}

interface Common { days: number; zone: string; from: string }

function common(row: Row): Common {
  return { days: num(row.days), zone: text(row.zone) ?? "UTC", from: text(row.from) ?? "" };
}

export interface MyDay { day: string; requests: number; tokens: number; costUsd: number }

export interface MyOverview extends Common {
  totals: { projects: number; chats: number; requests: number; organizations: number };
  requests: { total: number; answered: number; failed: number; blocked: number; chats: number };
  usage: {
    calls: number; failures: number; inputTokens: number; outputTokens: number; cacheTokens: number;
    costUsd: number; jevCalls: number; avgMs: number; devices: number;
  };
  /** As chamadas ao Jev hoje e o limite do plano (nulo: sem limite). */
  jev: { today: number; limit: number | null };
  daily: MyDay[];
  models: ModelUse[];
  /** `name` nulo é o ambiente pessoal. */
  environments: { id: string; name: string | null; requests: number; tokens: number; costUsd: number }[];
  recentChats: { id: string; code: string; title: string; project: string | null; environmentName: string | null; updatedAt: string }[];
}

export function parseMyOverview(value: unknown): MyOverview {
  const row = obj(value);
  const totals = obj(row.totals);
  const requests = obj(row.requests);
  const usage = obj(row.usage);
  const jev = obj(row.jev);
  return {
    ...common(row),
    totals: { projects: num(totals.projects), chats: num(totals.chats), requests: num(totals.requests), organizations: num(totals.organizations) },
    requests: { total: num(requests.total), answered: num(requests.answered), failed: num(requests.failed), blocked: num(requests.blocked), chats: num(requests.chats) },
    usage: {
      calls: num(usage.calls), failures: num(usage.failures), inputTokens: num(usage.input_tokens), outputTokens: num(usage.output_tokens),
      cacheTokens: num(usage.cache_tokens), costUsd: num(usage.cost_usd), jevCalls: num(usage.jev_calls), avgMs: num(usage.avg_ms), devices: num(usage.devices),
    },
    jev: { today: num(jev.today), limit: jev.limit === null || jev.limit === undefined ? null : num(jev.limit) },
    daily: list(row.daily).map((day) => ({ day: text(day.day) ?? "", requests: num(day.requests), tokens: num(day.tokens), costUsd: num(day.cost_usd) })),
    models: models(row.models),
    environments: list(row.environments).map((env) => ({
      id: text(env.id) ?? "personal", name: text(env.name), requests: num(env.requests), tokens: num(env.tokens), costUsd: num(env.cost_usd),
    })),
    recentChats: list(row.recent_chats).map((chat) => ({
      id: text(chat.id) ?? "", code: text(chat.code) ?? "", title: text(chat.title) ?? "", project: text(chat.project),
      environmentName: text(chat.environment_name), updatedAt: text(chat.updated_at) ?? "",
    })),
  };
}

export interface SystemDay { day: string; signups: number; sessions: number; active: number; requests: number; tokens: number; costUsd: number }

export interface Person {
  userId: string; email: string | null; username: string | null; displayName: string | null; avatarUrl: string | null;
}

export interface SystemOverview extends Common {
  users: {
    total: number; new: number; confirmed: number; mfa: number; banned: number; admins: number;
    signedInDay: number; signedInWeek: number; signedInPeriod: number;
  };
  access: { sessions: number; openSessions: number; activePeriod: number; activeWeek: number; activeDay: number };
  activity: {
    projects: number; chats: number; chatsNew: number; messages: number; requests: number;
    answered: number; failed: number; blocked: number; organizationRequests: number;
  };
  usage: { calls: number; failures: number; tokens: number; cacheTokens: number; costUsd: number; jevCalls: number; jevCostUsd: number };
  jev: { calls: number; users: number };
  organizations: { total: number; members: number; repositories: number };
  plans: { key: string; name: string | null; users: number }[];
  daily: SystemDay[];
  topUsers: (Person & { requests: number; tokens: number; costUsd: number; lastSignInAt: string | null })[];
  models: ModelUse[];
  recentUsers: (Person & { createdAt: string; lastSignInAt: string | null })[];
}

function person(row: Row): Person {
  return { userId: text(row.user_id) ?? "", email: text(row.email), username: text(row.username), displayName: text(row.display_name), avatarUrl: text(row.avatar_url) };
}

export function parseSystemOverview(value: unknown): SystemOverview {
  const row = obj(value);
  const users = obj(row.users);
  const access = obj(row.access);
  const activity = obj(row.activity);
  const usage = obj(row.usage);
  const jev = obj(row.jev);
  const organizations = obj(row.organizations);
  return {
    ...common(row),
    users: {
      total: num(users.total), new: num(users.new), confirmed: num(users.confirmed), mfa: num(users.mfa), banned: num(users.banned), admins: num(users.admins),
      signedInDay: num(users.signed_in_day), signedInWeek: num(users.signed_in_week), signedInPeriod: num(users.signed_in_period),
    },
    access: {
      sessions: num(access.sessions), openSessions: num(access.open_sessions), activePeriod: num(access.active_period),
      activeWeek: num(access.active_week), activeDay: num(access.active_day),
    },
    activity: {
      projects: num(activity.projects), chats: num(activity.chats), chatsNew: num(activity.chats_new), messages: num(activity.messages),
      requests: num(activity.requests), answered: num(activity.answered), failed: num(activity.failed), blocked: num(activity.blocked),
      organizationRequests: num(activity.organization_requests),
    },
    usage: {
      calls: num(usage.calls), failures: num(usage.failures), tokens: num(usage.tokens), cacheTokens: num(usage.cache_tokens),
      costUsd: num(usage.cost_usd), jevCalls: num(usage.jev_calls), jevCostUsd: num(usage.jev_cost_usd),
    },
    jev: { calls: num(jev.calls), users: num(jev.users) },
    organizations: { total: num(organizations.total), members: num(organizations.members), repositories: num(organizations.repositories) },
    plans: list(row.plans).map((plan) => ({ key: text(plan.key) ?? "—", name: text(plan.name), users: num(plan.users) })),
    daily: list(row.daily).map((day) => ({
      day: text(day.day) ?? "", signups: num(day.signups), sessions: num(day.sessions), active: num(day.active),
      requests: num(day.requests), tokens: num(day.tokens), costUsd: num(day.cost_usd),
    })),
    topUsers: list(row.top_users).map((user) => ({
      ...person(user), requests: num(user.requests), tokens: num(user.tokens), costUsd: num(user.cost_usd), lastSignInAt: text(user.last_sign_in_at),
    })),
    models: models(row.models),
    recentUsers: list(row.recent_users).map((user) => ({ ...person(user), createdAt: text(user.created_at) ?? "", lastSignInAt: text(user.last_sign_in_at) })),
  };
}

/** O maior valor de uma série, para a escala do gráfico (1 quando tudo é zero). */
export function peak(values: number[]) {
  return Math.max(1, ...values);
}

/** O nome que a página mostra de uma conta: o de exibição, o @usuário ou o e-mail. */
export function personName(user: Pick<Person, "displayName" | "username" | "email">) {
  return user.displayName || (user.username ? `@${user.username}` : null) || user.email || "—";
}
