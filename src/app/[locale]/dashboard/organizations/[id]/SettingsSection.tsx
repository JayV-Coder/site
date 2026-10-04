"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ConfirmAction, FormField, SettingsSection as Section } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFeedback } from "@/modules/feedback";
import { useHref, useT } from "@/modules/i18n";
import { canDelete, canManage } from "@/modules/organizations/rules";
import { deleteOrganization, leaveOrganization, renameOrganization, type ActionResult } from "../actions";
import type { Organization } from "../data";

/** Renomear, sair e excluir, trazidos das configurações da organização do
 * app. Excluir pede o slug digitado: apaga membros, convites e repositórios
 * de uma vez. Quem sai ou exclui volta para a lista. */
export function SettingsSection({ organization }: { organization: Organization }) {
  const t = useT();
  const href = useHref();
  const router = useRouter();
  const { notify, report } = useFeedback();
  const [busy, startBusy] = useTransition();
  const [name, setName] = useState(organization.name);
  const [confirm, setConfirm] = useState("");
  // Qual ação está indo: o giro aparece no botão dela.
  const [running, setRunning] = useState<"rename" | "leave" | "delete" | null>(null);

  const run = (key: "rename" | "leave" | "delete", action: () => Promise<ActionResult<null>>, after: () => void, done?: string) => startBusy(async () => {
    setRunning(key);
    const result = await action();
    setRunning(null);
    if (!result.ok) {
      report(result.error);
      return;
    }
    if (done) notify(done);
    after();
  });

  const toList = () => router.replace(href("/dashboard/organizations"));

  const rename = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || name.trim() === organization.name) return;
    run("rename", () => renameOrganization(organization.id, name), () => router.refresh(), t("org.settings.renamed"));
  };

  return (
    <div className="grid gap-5">
      {canManage(organization.role) && (
        <Section title={t("org.settings.rename")}>
          <form onSubmit={rename} className="flex flex-col gap-2 @lg:flex-row @lg:items-end">
            <FormField label={t("org.field.name")} htmlFor="org-rename" className="min-w-0 flex-1">
              <Input id="org-rename" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
            </FormField>
            <Button type="submit" loading={running === "rename"} disabled={busy || !name.trim() || name.trim() === organization.name}>{t("profile.save")}</Button>
          </form>
        </Section>
      )}
      <Section title={t("org.settings.leave")} description={t("org.settings.leave.description")}>
        <ConfirmAction title={t("org.settings.leave")} description={t("org.settings.leave.confirm", { name: organization.name })} confirm={t("org.settings.leave")}
          onConfirm={() => run("leave", () => leaveOrganization(organization.id), toList)}>
          <Button variant="outline" className="justify-self-start" loading={running === "leave"} disabled={busy}>{t("org.settings.leave")}</Button>
        </ConfirmAction>
      </Section>
      {canDelete(organization.role) && (
        <Section title={t("org.settings.delete")} description={t("org.settings.delete.description")}>
          <div className="flex flex-col gap-2 @lg:flex-row @lg:items-end">
            <FormField label={t("org.settings.delete.type", { slug: organization.slug })} htmlFor="org-delete" className="min-w-0 flex-1">
              <Input id="org-delete" spellCheck={false} autoCapitalize="none" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            </FormField>
            <Button variant="destructive" loading={running === "delete"} disabled={busy || confirm !== organization.slug} onClick={() => run("delete", () => deleteOrganization(organization.id), toList)}>
              {t("org.settings.delete")}
            </Button>
          </div>
        </Section>
      )}
    </div>
  );
}
