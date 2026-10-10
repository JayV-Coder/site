"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyText, ProviderIcon } from "@/components/atoms";
import { ConfirmAction, SettingsSection } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { useFeedback } from "@/modules/feedback";
import { useLocale, useT } from "@/modules/i18n";
import { deleteOrgProject } from "../actions";
import type { OrganizationDetail } from "../data";

/** Os projetos da organização, só para owner e maintainer: um repositório por
 * linha, quando ao menos um membro o tem como projeto no app, com quantos
 * membros o têm, os chats e a última atividade. Excluir só existe aqui (o app
 * não exclui projeto de organização): some do app de cada membro na próxima
 * sincronização, com os chats, e o repositório fica na organização. */
export function ProjectsSection({ detail }: { detail: OrganizationDetail }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { notify, report } = useFeedback();
  const [busy, startBusy] = useTransition();
  const [running, setRunning] = useState<string | null>(null);
  const org = detail.organization;
  const day = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));

  const remove = (repository: string) => startBusy(async () => {
    setRunning(repository);
    const result = await deleteOrgProject(org.id, repository);
    setRunning(null);
    if (!result.ok) {
      report(result.error);
      return;
    }
    notify(t("site.org.projects.deleted"));
    router.refresh();
  });

  return (
    <SettingsSection title={t("site.org.projects.title")} description={t("site.org.projects.description")}>
      {detail.projects === null ? <EmptyText>{t("site.org.projects.failed")}</EmptyText>
        : detail.projects.length === 0 ? <EmptyText>{t("site.org.projects.empty")}</EmptyText> : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
            {detail.projects.map((project) => (
              <li key={project.repositoryId} className="grid grid-cols-[minmax(0,1fr)] gap-1 rounded-md border border-border/70 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <ProviderIcon provider={project.provider} className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-mono text-sm" title={project.repoKey}>{project.path}</span>
                  <ConfirmAction title={t("site.org.projects.delete.title")}
                    description={t("site.org.projects.delete.description", { repo: project.path })}
                    confirm={t("common.delete")} onConfirm={() => remove(project.repositoryId)}>
                    <Button variant="ghost" size="sm" aria-label={t("site.org.projects.delete.label", { repo: project.path })}
                      loading={running === project.repositoryId} disabled={busy}
                      className="shrink-0 text-muted-foreground hover:text-destructive">{t("common.delete")}</Button>
                  </ConfirmAction>
                </div>
                <p className="flex flex-wrap items-center gap-x-1.5 ps-6 text-xs text-muted-foreground">
                  <span>{t("org.count.members", { count: project.members })}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t("site.org.projects.chats", { count: project.chats })}</span>
                  {project.lastActivity && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{t("site.org.projects.lastActivity", { date: day(project.lastActivity) })}</span>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
    </SettingsSection>
  );
}
