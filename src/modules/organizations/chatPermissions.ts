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

/** Uma linha de `organization_chat_permissions` como o supabase-js a devolve:
 * as permissões bloqueadas. */
export function storedChatPermissions(row: Record<string, unknown> | null | undefined): ChatKind[] {
  return chatKindsOf(row?.blocked);
}
