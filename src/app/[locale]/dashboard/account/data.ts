import "server-only";
import { auth } from "@/auth";
import { readUser, verifiedTotp } from "@/modules/auth/account";
import { avatarUrl, displayName } from "@/modules/auth/session";
import { fromRow, type AccountProfile, type ProfileRow } from "@/modules/profile/fields";
import { userSupabase } from "@/modules/supabase/server";

/** As colunas do perfil que a página lê, as mesmas do app. */
export const PROFILE_COLUMNS = "display_name,username,sex,gender,gender_custom,pronouns,pronouns_custom,birth_date,country,timezone,role,company,completed_at,username_set_at";

export interface AccountData {
  email: string | null;
  profile: AccountProfile | null;
  /** As identidades da conta (`email`, `github`, `gitlab`, `bitbucket`). */
  providers: string[];
  hasPassword: boolean;
  /** O app autenticador já confirmado, quando a conta tem um. */
  totpFactorId: string | null;
  /** O que o cartão do topo mostra, como o do Perfil do app. */
  card: AccountCard;
}

export interface AccountCard {
  /** O nome do provedor (só no login por provedor). */
  providerName: string | null;
  /** A foto da conta: a que a pessoa escolheu ou, sem ela, a do provedor. */
  avatarUrl: string | null;
  /** A foto foi escolhida aqui (e pode ser tirada). */
  avatarCustom: boolean;
  /** O provedor do último login: `email`, `github`, `gitlab` ou `bitbucket`. */
  lastProvider: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  /** O nível com que o Jev trata a pessoa (`account_settings.expertise_level`). */
  expertise: string | null;
}

const EXPERTISE = ["starter", "junior", "mid", "senior", "architect"];

/** A conta de quem entrou, como a página de Perfil do app a monta: o perfil
 * do banco, as identidades e os fatores do Supabase Auth e se há senha (a
 * conta OAuth que define senha não ganha a identidade `email`, então só o
 * banco sabe — `account_has_password`). */
export async function loadAccount(): Promise<AccountData | null> {
  const [session, supabase] = await Promise.all([auth(), userSupabase()]);
  if (!session?.accessToken || !supabase) return null;
  const [user, password, profile, expertise] = await Promise.all([
    readUser(session.accessToken),
    supabase.rpc("account_has_password"),
    supabase.from("profiles").select(`${PROFILE_COLUMNS},avatar_url,avatar_custom`).maybeSingle(),
    supabase.from("account_settings").select("value").eq("key", "expertise_level").is("row_deleted_at", null).maybeSingle(),
  ]);
  if (profile.error) throw new Error(profile.error.message);
  const photo = profile.data as { avatar_url?: string | null; avatar_custom?: boolean } | null;
  return {
    email: user.email ?? null,
    profile: profile.data ? fromRow(profile.data as ProfileRow) : null,
    providers: (user.identities ?? []).map((identity) => identity.provider),
    hasPassword: password.data === true,
    totpFactorId: verifiedTotp(user),
    card: {
      providerName: displayName(user),
      // O banco guarda a foto que vale em todo login (migração `profile_photo`);
      // a do provedor é só a reserva de um perfil ainda sem foto.
      avatarUrl: photo?.avatar_url || avatarUrl(user) || null,
      avatarCustom: photo?.avatar_custom === true,
      lastProvider: user.app_metadata?.provider ?? "email",
      createdAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      expertise: EXPERTISE.includes(expertise.data?.value ?? "") ? expertise.data!.value : null,
    },
  };
}
