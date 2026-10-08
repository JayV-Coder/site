"use server";

import { fromRow, newestFirst, NOTIFICATION_LIMIT, type SiteNotification } from "@/modules/notifications/rules";
import { userSupabase } from "@/modules/supabase/server";

export interface NotificationBox {
  notifications: SiteNotification[];
  /** Os convites que ainda esperam resposta: só neles se aceita ou recusa. */
  pendingInvites: string[];
}

/** As notificações da conta, lidas com o token de quem entrou (a RLS dá a
 * cada um só as suas). Nulo sem sessão ou com o banco fora do ar: o sino
 * guarda o que já tinha. */
export async function loadNotifications(): Promise<NotificationBox | null> {
  const supabase = await userSupabase();
  if (!supabase) return null;
  const [rows, invites] = await Promise.all([
    supabase.from("notifications").select("id, kind, data, created_at, read_at").order("created_at", { ascending: false }).limit(NOTIFICATION_LIMIT),
    supabase.rpc("my_invites"),
  ]);
  if (rows.error) {
    console.error("notifications", rows.error);
    return null;
  }
  const notifications = (rows.data ?? []).flatMap((row) => fromRow(row) ?? []);
  const pendingInvites = ((invites.data ?? []) as { id: string }[]).map((invite) => invite.id);
  return { notifications: newestFirst(notifications), pendingInvites };
}

/** Marca como lidas (`null` marca todas), as mesmas RPCs do app. */
export async function markNotificationsRead(ids: string[] | null) {
  const supabase = await userSupabase();
  if (!supabase) return false;
  const { error } = await supabase.rpc("mark_notifications_read", { ids });
  if (error) console.error("notifications", error);
  return !error;
}

export async function clearReadNotifications() {
  const supabase = await userSupabase();
  if (!supabase) return false;
  const { error } = await supabase.rpc("clear_notifications");
  if (error) console.error("notifications", error);
  return !error;
}

/** Aceita ou recusa o convite que a notificação trouxe. */
export async function answerInvite(invite: string, accept: boolean) {
  const supabase = await userSupabase();
  if (!supabase) return false;
  const { error } = await supabase.rpc(accept ? "accept_invite" : "decline_invite", { invite });
  if (error) console.error("notifications", error);
  return !error;
}
