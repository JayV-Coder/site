"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon } from "lucide-react";
import { FormField, ToggleRow } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFeedback } from "@/modules/feedback";
import { useT } from "@/modules/i18n";
import { DISPLAY_NAME_MAX, USERNAME_MAX, usernameOk } from "@/modules/profile/fields";
import { updateProfile } from "../actions";

/** O admin corrige o nome de exibição e o nome de usuário — que a pessoa só
 * escolhe uma vez — e pode liberar uma nova escolha dela. Os campos abrem
 * travados, como na Conta: "Editar" libera. */
export function UserProfileEditor({ target, displayName, username, locked }: { target: string; displayName: string; username: string; locked: boolean }) {
  const t = useT();
  const router = useRouter();
  const { notify, report } = useFeedback();
  const [busy, startBusy] = useTransition();
  const [name, setName] = useState(displayName);
  const [handle, setHandle] = useState(username);
  const [unlock, setUnlock] = useState(false);
  const [editing, setEditing] = useState(false);
  const badHandle = handle.length > 0 && !usernameOk(handle);
  const dirty = name.trim() !== displayName || handle !== username || unlock;

  const cancel = () => {
    setName(displayName);
    setHandle(username);
    setUnlock(false);
    setEditing(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    startBusy(async () => {
      const result = await updateProfile(target, name.trim(), handle, unlock);
      if (!result.ok) {
        report(result.error);
        return;
      }
      notify(t("profile.saved"));
      setUnlock(false);
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 border-t border-border/70 pt-4">
      <p className="text-sm font-medium">{t("site.users.editProfile")}</p>
      <fieldset disabled={!editing || busy} className="grid min-w-0 gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t("profile.field.displayName")} htmlFor="user-display-name">
            <Input id="user-display-name" required maxLength={DISPLAY_NAME_MAX} value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <FormField label={t("profile.field.username")} htmlFor="user-username" error={badHandle ? t("profile.username.invalid", { min: 3, max: USERNAME_MAX }) : null}>
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-sm text-muted-foreground">@</span>
              <Input id="user-username" required maxLength={USERNAME_MAX} spellCheck={false} autoCapitalize="none" className="ps-7" aria-invalid={badHandle || undefined}
                value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase().replace(/\s/g, ""))} />
            </div>
          </FormField>
        </div>
        {locked && (
          <ToggleRow id="user-unlock-username" label={t("site.users.unlockUsername")} hint={t("site.users.unlockUsername.hint")} checked={unlock} onChange={setUnlock} disabled={!editing || busy} />
        )}
      </fieldset>
      <div className="flex flex-wrap justify-end gap-2">
        {editing ? (
          <>
            <Button type="button" variant="ghost" disabled={busy} onClick={cancel}>{t("common.cancel")}</Button>
            <Button type="submit" loading={busy} disabled={!dirty || !name.trim() || badHandle}>{t("profile.save")}</Button>
          </>
        ) : (
          <Button type="button" variant="outline" onClick={() => setEditing(true)}><PencilIcon />{t("site.account.edit")}</Button>
        )}
      </div>
    </form>
  );
}
