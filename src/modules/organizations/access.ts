/** "O que esta pessoa pode fazer, e por quê" (roadmap 3.5): junta o papel na
 * organização, o plano da pessoa, a política de LLM, as permissões do chat,
 * os comandos bloqueados e a política de validação numa lista só, cada linha
 * com a regra que decide. A tela só desenha a lista. */
import { FEATURES, type FeatureKey } from "@/modules/plans/catalog";
import { CHAT_KINDS, chatStates, type ChatKind } from "./chatPermissions";
import type { StoredCommandRules } from "./commands";
import { AGENT_LABELS, POLICY_AGENTS, POLICY_RULES, type StoredPolicy } from "./policy";
import { isRole, type Role } from "./rules";
import type { ValidationPolicy } from "./validationPolicy";

type Row = Record<string, unknown>;

export interface MemberPlan {
  userId: string;
  role: Role;
  /** Admin do sistema: tem todo recurso, qualquer que seja o plano. */
  admin: boolean;
  plan: string;
  planName: string;
  features: string[];
  jevDailyRequests: number | null;
}

export interface MemberPlans { off: string[]; members: MemberPlan[] }

export function memberPlansOf(data: unknown): MemberPlans {
  const value = (data && typeof data === "object" ? data : {}) as Row;
  const strings = (items: unknown) => (Array.isArray(items) ? items.filter((item): item is string => typeof item === "string") : []);
  const members = (Array.isArray(value.members) ? value.members : []).filter((item): item is Row => !!item && typeof item === "object");
  return {
    off: strings(value.off),
    members: members.flatMap((row) => (isRole(row.role) ? [{
      userId: String(row.user_id ?? ""),
      role: row.role,
      admin: row.admin === true,
      plan: String(row.plan ?? ""),
      planName: String(row.plan_name ?? row.plan ?? ""),
      features: strings(row.features),
      jevDailyRequests: typeof row.jev_daily_requests === "number" ? row.jev_daily_requests : null,
    }] : [])),
  };
}

/** `allowed`: pode; `limited`: pode com uma condição; `blocked`: não pode;
 * `required`: é obrigado. */
export type AccessState = "allowed" | "limited" | "blocked" | "required";

/** Uma linha da tela: o que (`item`, uma chave do i18n com `params`), o
 * estado e a regra que decide (`reason`, outra chave). */
export interface AccessLine {
  id: string;
  item: string;
  params?: Record<string, string | number>;
  state: AccessState;
  reason: string;
  reasonParams?: Record<string, string | number>;
}

export interface AccessArea { id: "role" | "plan" | "agents" | "chat" | "commands" | "validation"; lines: AccessLine[] }

export interface AccessInput {
  role: Role;
  plan: MemberPlan | null;
  off: string[];
  policies: StoredPolicy[];
  commandRules: StoredCommandRules[];
  chatBlocked: ChatKind[];
  chatEnabled: ChatKind[];
  validation: ValidationPolicy;
}

const ROLE_POWERS: { id: string; roles: Role[] }[] = [
  { id: "useProjects", roles: ["owner", "maintainer", "member"] },
  { id: "invite", roles: ["owner", "maintainer"] },
  { id: "policies", roles: ["owner", "maintainer"] },
  { id: "audit", roles: ["owner", "maintainer"] },
  { id: "roles", roles: ["owner"] },
  { id: "delete", roles: ["owner"] },
];

export function accessOf(input: AccessInput): AccessArea[] {
  const areas: AccessArea[] = [];

  areas.push({
    id: "role",
    lines: ROLE_POWERS.map((power) => ({
      id: `role-${power.id}`, item: `site.access.role.${power.id}`,
      state: power.roles.includes(input.role) ? "allowed" : "blocked",
      reason: "site.access.reason.role", reasonParams: { role: input.role },
    })),
  });

  if (input.plan) {
    const plan = input.plan;
    areas.push({
      id: "plan",
      lines: FEATURES.map((feature: FeatureKey) => {
        const line = { id: `plan-${feature}`, item: `feature.${feature}.title` };
        if (plan.admin) return { ...line, state: "allowed" as const, reason: "site.access.reason.systemAdmin" };
        if (input.off.includes(feature)) return { ...line, state: "blocked" as const, reason: "site.access.reason.featureOff" };
        if (!plan.features.includes(feature)) return { ...line, state: "blocked" as const, reason: "site.access.reason.notInPlan", reasonParams: { plan: plan.planName } };
        return { ...line, state: "allowed" as const, reason: "site.access.reason.inPlan", reasonParams: { plan: plan.planName } };
      }),
    });
  }

  const org = input.policies.find((policy) => policy.repositoryId === null) ?? null;
  const repoPolicies = input.policies.filter((policy) => policy.repositoryId !== null).length;
  const agents: AccessLine[] = POLICY_AGENTS.map((agent) => {
    const allowed = !org?.agents || org.agents.includes(agent);
    const blockedModels = org?.blocked_models.filter((model) => model.startsWith(`${agent}/`)).length ?? 0;
    const blockedMechanisms = org?.blocked_mechanisms.filter((item) => item.startsWith(`${agent}/`)).length ?? 0;
    const limited = allowed && (blockedModels > 0 || blockedMechanisms > 0);
    return {
      id: `agent-${agent}`, item: "site.access.agent", params: { agent: AGENT_LABELS[agent] },
      state: !allowed ? "blocked" : limited ? "limited" : "allowed",
      reason: !org ? "site.access.reason.noPolicy" : !allowed ? "site.access.reason.agentOff" : limited ? "site.access.reason.agentLimited" : "site.access.reason.policy",
      reasonParams: { models: blockedModels, mechanisms: blockedMechanisms },
    };
  });
  for (const rule of POLICY_RULES) {
    const value = org ? org[`min_${rule}`] : "allow";
    agents.push({
      id: `rule-${rule}`, item: `site.access.rule.${rule}`,
      state: value === "deny" ? "blocked" : value === "ask" ? "limited" : "allowed",
      reason: org ? `site.access.reason.rule.${value}` : "site.access.reason.noPolicy",
    });
  }
  if (org && org.deny.length > 0) agents.push({ id: "deny", item: "site.access.deny", params: { count: org.deny.length }, state: "blocked", reason: "site.access.reason.policy" });
  if (org?.redact_secrets) agents.push({ id: "redact", item: "site.access.redact", state: "required", reason: "site.access.reason.policy" });
  if (repoPolicies > 0) agents.push({ id: "repo-policies", item: "site.access.repoPolicies", params: { count: repoPolicies }, state: "limited", reason: "site.access.reason.repoPolicy" });
  areas.push({ id: "agents", lines: agents });

  const states = chatStates(input.chatBlocked, input.chatEnabled);
  areas.push({
    id: "chat",
    lines: CHAT_KINDS.map((kind) => ({
      id: `chat-${kind}`, item: `site.access.chat.${kind}`,
      state: states[kind] === "blocked" ? "blocked" : states[kind] === "on" ? "required" : "allowed",
      reason: `site.access.reason.chat.${states[kind]}`,
    })),
  });

  const orgRules = input.commandRules.find((rules) => rules.repositoryId === null)?.blocked ?? [];
  const repoRules = input.commandRules.filter((rules) => rules.repositoryId !== null && rules.blocked.length > 0).length;
  areas.push({
    id: "commands",
    lines: [
      ...orgRules.map((command) => ({ id: `command-${command}`, item: "site.access.command", params: { command }, state: "blocked" as const, reason: "site.access.reason.commandRule" })),
      ...(orgRules.length === 0 ? [{ id: "commands-none", item: "site.access.commandsNone", state: "allowed" as const, reason: "site.access.reason.noCommandRule" }] : []),
      ...(repoRules > 0 ? [{ id: "commands-repos", item: "site.access.commandsRepos", params: { count: repoRules }, state: "limited" as const, reason: "site.access.reason.repoPolicy" }] : []),
    ],
  });

  areas.push({
    id: "validation",
    lines: [
      { id: "validation-required", item: "site.access.validation.required", state: input.validation.required ? "required" : "allowed", reason: input.validation.required ? "site.access.reason.validationOn" : "site.access.reason.validationOff" },
      ...(input.validation.holdCommits ? [{ id: "validation-hold", item: "site.access.validation.hold", state: "limited" as const, reason: "site.access.reason.validationOn" }] : []),
    ],
  });

  return areas;
}
