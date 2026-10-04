/** Uma mensagem é texto com `{marcas}` para os valores, ou uma forma por
 * categoria de plural — o `Intl.PluralRules` do idioma escolhe qual. Igual ao
 * app (`src/modules/i18n/types.ts` do jayv-coder). */
export type Plural = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
export type Message = string | Plural;

import type { en } from "./messages/en";

export type Key = keyof typeof en;
/** O que chega do Supabase para um idioma: pode faltar chave — a nova, que
 * ainda não foi traduzida —, e aí vale o inglês. */
export type Messages = Partial<Record<Key, Message>>;
export type Params = Record<string, string | number>;

export type Locale = string;
export interface LocaleOption { id: Locale; name: string; rtl?: boolean }

/** O erro já pronto para a tela: a chave e os valores que ela cita. */
export interface Text { key: string; params?: Params }
