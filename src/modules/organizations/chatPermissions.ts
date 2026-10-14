/** As permissões do chat da organização: quais permissões do seletor do chat
 * no app (rodar comandos, escrever no Git, usar a rede) as pessoas podem
 * ligar nos projetos dela. Valem para a organização inteira. É o mesmo
 * formato de `set_chat_permissions`; o app (`src/modules/organizations/
 * commands.ts` do jayv-coder) lê as bloqueadas em `blocked_grants`. */

export const CHAT_KINDS = ["shell", "git", "network"] as const;
export type ChatKind = (typeof CHAT_KINDS)[number];

/** Só as três permissões do seletor, sem repetição e na ordem dele. */
export function chatKindsOf(value: unknown): ChatKind[] {
  const listed = Array.isArray(value) ? value.map(String) : [];
  return CHAT_KINDS.filter((kind) => listed.includes(kind));
}

/** Os três estados de uma permissão: livre (a pessoa liga), sempre ligada ou bloqueada. */
export type ChatState = "free" | "on" | "blocked";

/** Uma linha de `organization_chat_permissions` como o supabase-js a devolve:
 * as permissões bloqueadas (`blocked`) ou as sempre ligadas (`enabled`). */
export function storedChatPermissions(row: Record<string, unknown> | null | undefined, column: "blocked" | "enabled" = "blocked"): ChatKind[] {
  return chatKindsOf(row?.[column]);
}

/** O estado de cada permissão a partir das duas listas; a bloqueada vence. */
export function chatStates(blocked: readonly ChatKind[], enabled: readonly ChatKind[]): Record<ChatKind, ChatState> {
  return Object.fromEntries(CHAT_KINDS.map((kind) => [kind, blocked.includes(kind) ? "blocked" : enabled.includes(kind) ? "on" : "free"])) as Record<ChatKind, ChatState>;
}

/** As duas listas que `set_chat_permissions` recebe, a partir dos estados. */
export function chatLists(states: Record<ChatKind, ChatState>): { blocked: ChatKind[]; enabled: ChatKind[] } {
  return { blocked: CHAT_KINDS.filter((kind) => states[kind] === "blocked"), enabled: CHAT_KINDS.filter((kind) => states[kind] === "on") };
}
