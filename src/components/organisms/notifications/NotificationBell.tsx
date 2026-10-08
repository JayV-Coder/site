"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useHref, useLocale, useT, type Key } from "@/modules/i18n";
import { describe, targetOf, timeAgo, toneOf, type SiteNotification, type Tone } from "@/modules/notifications/rules";
import { answerInvite, clearReadNotifications, loadNotifications, markNotificationsRead } from "./actions";

/** De quanto em quanto tempo o sino olha o banco com a página aberta. O site
 * não guarda a sessão no navegador, então não há Realtime como no app. */
const REFRESH_MS = 60_000;

const DOT: Record<Tone, string> = { go: "bg-go", ask: "bg-ask", stop: "bg-stop", info: "bg-info" };

/** O sino do cabeçalho e a central que ele abre: as mesmas notificações da
 * conta que o app mostra (organizações), da mais nova para a mais velha. Ler
 * uma aqui a marca como lida no app, e o contrário. O convite ainda pendente
 * se responde ali mesmo. */
export function NotificationBell() {
  const t = useT();
  const locale = useLocale();
  const href = useHref();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<SiteNotification[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const box = await loadNotifications();
      if (!box) return;
      setList(box.notifications);
      setPending(box.pendingInvites);
    } catch (error) {
      console.error("notifications", error);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const tick = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  const unread = useMemo(() => list.filter((item) => !item.read).length, [list]);
  const anyRead = list.some((item) => item.read);

  const markLocal = (ids: string[] | null) => setList((current) => current.map((item) => (ids === null || ids.includes(item.id) ? { ...item, read: true } : item)));
  const read = (ids: string[] | null) => {
    markLocal(ids);
    void markNotificationsRead(ids);
  };
  const go = (notification: SiteNotification) => {
    if (!notification.read) read([notification.id]);
    const target = targetOf(notification);
    if (!target) return;
    setOpen(false);
    router.push(href(target));
  };
  const answer = async (notification: SiteNotification, invite: string, accept: boolean) => {
    setBusy(invite);
    try {
      if (await answerInvite(invite, accept)) {
        setPending((current) => current.filter((id) => id !== invite));
        read([notification.id]);
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  };
  const clear = async () => {
    setList((current) => current.filter((item) => !item.read));
    await clearReadNotifications();
  };

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) void refresh(); }}>
      <PopoverTrigger
        aria-label={unread > 0 ? t("notifications.unread", { count: unread }) : t("notifications.title")}
        title={t("notifications.title")}
        className="relative grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-secondary data-[state=open]:text-foreground"
      >
        <BellIcon aria-hidden="true" className="size-[18px]" />
        {unread > 0 && (
          <span aria-hidden="true" className="absolute -top-0.5 -end-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 font-mono text-[10px] leading-none font-semibold text-primary-foreground tabular-nums ring-2 ring-background">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="flex max-h-[min(560px,calc(100dvh-5rem))] w-[min(23.75rem,calc(100vw-2rem))] flex-col p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="grid">
            <h2 className="text-sm font-semibold">{t("notifications.title")}</h2>
            <p className="text-caption text-muted-foreground">{unread > 0 ? t("notifications.unread", { count: unread }) : t("notifications.allRead")}</p>
          </div>
          {unread > 0 && <Button size="sm" variant="ghost" onClick={() => read(null)}>{t("notifications.markAllRead")}</Button>}
        </div>
        {list.length === 0 ? (
          <div className="grid place-items-center gap-2 px-6 py-10 text-center">
            <BellIcon aria-hidden="true" className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">{t("notifications.empty.title")}</p>
            <p className="text-caption text-muted-foreground">{t("site.notifications.empty")}</p>
          </div>
        ) : (
          <ul className="grid min-h-0 gap-0.5 overflow-y-auto p-1.5">
            {list.map((notification) => {
              const { title, params, byKey, by } = describe(notification);
              const tone = toneOf(notification.kind);
              const invite = notification.kind === "org.invited" && typeof notification.data.inviteId === "string" && pending.includes(notification.data.inviteId) ? notification.data.inviteId : null;
              const clickable = targetOf(notification) !== null || !notification.read;
              const role = params.role ? t(`org.role.${params.role}` as Key) : "";
              return (
                <li key={notification.id} className={cn("group relative grid grid-cols-[7px_minmax(0,1fr)] gap-x-3 rounded-md ps-3 pe-6 py-2.5 transition-colors", clickable && "hover:bg-muted/60")}>
                  <span aria-hidden="true" className={cn("mt-1.5 size-[7px] rounded-full", DOT[tone])} />
                  <div className="grid min-w-0 gap-0.5">
                    <button
                      type="button"
                      onClick={() => go(notification)}
                      disabled={!clickable}
                      className="text-start text-[13px] leading-snug outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring disabled:cursor-default"
                    >
                      <span className={cn(notification.read ? "text-muted-foreground" : "font-medium text-foreground")}>{t(title, { ...params, role })}</span>
                    </button>
                    <p className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
                      {byKey && <span className="truncate">{t(byKey, { user: by })}</span>}
                      {byKey && <span aria-hidden="true">·</span>}
                      <time dateTime={notification.createdAt} className="shrink-0 tabular-nums">{timeAgo(notification.createdAt, locale)}</time>
                    </p>
                    {invite && (
                      <div className="relative z-10 mt-1.5 flex gap-1.5">
                        <Button size="xs" disabled={busy === invite} onClick={() => void answer(notification, invite, true)}>{t("org.invites.accept")}</Button>
                        <Button size="xs" variant="ghost" disabled={busy === invite} onClick={() => void answer(notification, invite, false)}>{t("org.invites.decline")}</Button>
                      </div>
                    )}
                  </div>
                  {!notification.read && <span aria-label={t("notifications.unreadMark")} className="absolute end-3 top-3.5 size-1.5 rounded-full bg-primary" />}
                </li>
              );
            })}
          </ul>
        )}
        {anyRead && (
          <div className="flex justify-end border-t border-border px-2 py-1.5">
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => void clear()}>{t("notifications.clearRead")}</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
