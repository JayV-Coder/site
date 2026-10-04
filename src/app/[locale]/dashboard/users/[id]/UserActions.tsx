"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SettingsSection } from "@/components/molecules";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFeedback } from "@/modules/feedback";
import { useHref, useLocale, useT } from "@/modules/i18n";
import {
  confirmEmail, deleteUser, resetMfa, sendPasswordReset, setAdmin, setBanned, signOutEverywhere, type ActionResult,
} from "../actions";

interface Target { id: string; email: string | null; isAdmin: boolean; banned: boolean; confirmed: boolean; hasMfa: boolean; self: boolean }

/** Uma ação com confirmação: o que ela faz, o botão que confirma e, para as
 * graves, o tom destrutivo. */
function Confirmed({ title, description, confirm, danger, onConfirm, children }: {
  title: string; description: string; confirm: string; danger?: boolean; onConfirm: () => void; children: ReactNode;
}) {
  const t = useT();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction className={buttonVariants({ variant: danger ? "destructive" : "default" })} onClick={onConfirm}>{confirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** O que o admin faz com uma conta. Na própria conta só cabe o que não o
 * tranca para fora (o banco recusa o resto de qualquer jeito). */
export function UserActions({ user }: { user: Target }) {
  const t = useT();
  const href = useHref();
  const locale = useLocale();
  const router = useRouter();
  const { notify, report } = useFeedback();
  const [busy, startBusy] = useTransition();
  const [typed, setTyped] = useState("");
  const others = !user.self;

  const run = (action: () => Promise<ActionResult>, done: string, after?: () => void) => startBusy(async () => {
    const result = await action();
    if (!result.ok) {
      report(result.error);
      return;
    }
    notify(done);
    if (after) after();
    else router.refresh();
  });

  return (
    <SettingsSection title={t("site.users.section.actions")} description={user.self ? t("site.users.selfNote") : t("site.users.actionsNote")}>
      <div className="flex flex-wrap gap-2">
        {others && (
          <Confirmed title={t(user.isAdmin ? "site.users.revokeAdmin.title" : "site.users.grantAdmin.title")}
            description={t(user.isAdmin ? "site.users.revokeAdmin.description" : "site.users.grantAdmin.description")}
            confirm={t(user.isAdmin ? "site.users.revokeAdmin" : "site.users.grantAdmin")}
            onConfirm={() => run(() => setAdmin(user.id, !user.isAdmin), t(user.isAdmin ? "site.users.revokeAdmin.done" : "site.users.grantAdmin.done"))}>
            <Button variant="outline" disabled={busy}>{t(user.isAdmin ? "site.users.revokeAdmin" : "site.users.grantAdmin")}</Button>
          </Confirmed>
        )}
        {user.email && (
          <Confirmed title={t("site.users.passwordReset.title")} description={t("site.users.passwordReset.description", { email: user.email })}
            confirm={t("site.users.passwordReset")} onConfirm={() => run(() => sendPasswordReset(user.id, locale), t("site.users.passwordReset.done", { email: user.email ?? "" }))}>
            <Button variant="outline" disabled={busy}>{t("site.users.passwordReset")}</Button>
          </Confirmed>
        )}
        {!user.confirmed && (
          <Confirmed title={t("site.users.confirmEmail.title")} description={t("site.users.confirmEmail.description")}
            confirm={t("site.users.confirmEmail")} onConfirm={() => run(() => confirmEmail(user.id), t("site.users.confirmEmail.done"))}>
            <Button variant="outline" disabled={busy}>{t("site.users.confirmEmail")}</Button>
          </Confirmed>
        )}
        {others && user.hasMfa && (
          <Confirmed title={t("site.users.resetMfa.title")} description={t("site.users.resetMfa.description")} danger
            confirm={t("site.users.resetMfa")} onConfirm={() => run(() => resetMfa(user.id), t("site.users.resetMfa.done"))}>
            <Button variant="outline" disabled={busy}>{t("site.users.resetMfa")}</Button>
          </Confirmed>
        )}
        {others && (
          <Confirmed title={t("site.users.signOut.title")} description={t("site.users.signOut.description")}
            confirm={t("site.users.signOut")} onConfirm={() => run(() => signOutEverywhere(user.id), t("site.users.signOut.done"))}>
            <Button variant="outline" disabled={busy}>{t("site.users.signOut")}</Button>
          </Confirmed>
        )}
        {others && (user.banned ? (
          <Confirmed title={t("site.users.unban.title")} description={t("site.users.unban.description")}
            confirm={t("site.users.unban")} onConfirm={() => run(() => setBanned(user.id, false), t("site.users.unban.done"))}>
            <Button variant="outline" disabled={busy}>{t("site.users.unban")}</Button>
          </Confirmed>
        ) : (
          <Confirmed title={t("site.users.ban.title")} description={t("site.users.ban.description")} danger
            confirm={t("site.users.ban")} onConfirm={() => run(() => setBanned(user.id, true), t("site.users.ban.done"))}>
            <Button variant="outline" className="text-destructive" disabled={busy || user.isAdmin} title={user.isAdmin ? t("site.users.error.isAdmin") : undefined}>{t("site.users.ban")}</Button>
          </Confirmed>
        ))}
      </div>

      {others && (
        <div className="grid gap-2 border-t border-border/70 pt-4">
          <p className="text-sm font-medium text-destructive">{t("site.users.delete")}</p>
          <p className="text-xs text-muted-foreground">{t("site.users.delete.description")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input aria-label={t("site.users.delete.type", { email: user.email ?? user.id })} placeholder={user.email ?? user.id} className="max-w-xs"
              spellCheck={false} autoCapitalize="none" value={typed} onChange={(event) => setTyped(event.target.value)} />
            <Button variant="destructive" loading={busy} disabled={user.isAdmin || typed.trim() !== (user.email ?? user.id)}
              onClick={() => run(() => deleteUser(user.id), t("site.users.delete.done"), () => router.replace(href("/dashboard/users")))}>
              {t("site.users.delete")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{user.isAdmin ? t("site.users.error.isAdmin") : t("site.users.delete.type", { email: user.email ?? user.id })}</p>
        </div>
      )}
    </SettingsSection>
  );
}
