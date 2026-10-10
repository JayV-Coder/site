"use client";

import { FolderGit2Icon, FolderKanbanIcon, LockKeyholeIcon, PlugIcon, SettingsIcon, ShieldCheckIcon, SparklesIcon, UsersIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/modules/i18n";
import { canManage } from "@/modules/organizations/rules";
import type { OrganizationDetail } from "../data";
import { InviteSection } from "./InviteSection";
import { MembersSection } from "./MembersSection";
import { McpSection } from "./McpSection";
import { PermissionsSection } from "./PermissionsSection";
import { PolicySection } from "./PolicySection";
import { ProjectsSection } from "./ProjectsSection";
import { RepositoriesSection, type GitOutcome } from "./RepositoriesSection";
import { SettingsSection } from "./SettingsSection";
import { SkillsSection } from "./SkillsSection";

export type OrganizationTab = "members" | "projects" | "repositories" | "policy" | "permissions" | "mcp" | "skills" | "settings";

/** As abas (na vertical, ao lado do conteúdo) da organização que saíram do app para o painel: convite,
 * projetos (só owner e maintainer, como a exclusão deles), repositórios (o provedor git do owner), política de LLM,
 * permissões de comandos, servidores MCP, skills e configurações. Projetos vem logo depois de Membros, na ordem do
 * menu da organização no app (Projetos antes de Repositórios). */
export function OrganizationBoard({ detail, tab, outcome }: {
  detail: OrganizationDetail; tab: OrganizationTab; outcome: { kind: GitOutcome; provider: string | null; pick: boolean } | null;
}) {
  const t = useT();
  const manages = canManage(detail.organization.role);
  return (
    <Tabs orientation="vertical" defaultValue={tab} className="gap-3 @lg:gap-6">
      <TabsList className="sticky top-4 h-auto w-11 shrink-0 gap-0.5 py-1 pr-1 @lg:w-52">
        <TabsTrigger value="members" title={t("org.tab.members")} aria-label={t("org.tab.members")} className="flex-none gap-2.5 px-3 py-2"><UsersIcon /><span className="hidden @lg:inline">{t("org.tab.members")}</span></TabsTrigger>
        {manages && (
          <TabsTrigger value="projects" title={t("site.org.tab.projects")} aria-label={t("site.org.tab.projects")} className="flex-none gap-2.5 px-3 py-2"><FolderKanbanIcon /><span className="hidden @lg:inline">{t("site.org.tab.projects")}</span></TabsTrigger>
        )}
        <TabsTrigger value="repositories" title={t("org.tab.repositories")} aria-label={t("org.tab.repositories")} className="flex-none gap-2.5 px-3 py-2"><FolderGit2Icon /><span className="hidden @lg:inline">{t("org.tab.repositories")}</span></TabsTrigger>
        <TabsTrigger value="policy" title={t("org.tab.policy")} aria-label={t("org.tab.policy")} className="flex-none gap-2.5 px-3 py-2"><ShieldCheckIcon /><span className="hidden @lg:inline">{t("org.tab.policy")}</span></TabsTrigger>
        <TabsTrigger value="permissions" title={t("site.org.tab.permissions")} aria-label={t("site.org.tab.permissions")} className="flex-none gap-2.5 px-3 py-2"><LockKeyholeIcon /><span className="hidden @lg:inline">{t("site.org.tab.permissions")}</span></TabsTrigger>
        <TabsTrigger value="mcp" title={t("site.org.tab.mcp")} aria-label={t("site.org.tab.mcp")} className="flex-none gap-2.5 px-3 py-2"><PlugIcon /><span className="hidden @lg:inline">{t("site.org.tab.mcp")}</span></TabsTrigger>
        <TabsTrigger value="skills" title={t("site.org.tab.skills")} aria-label={t("site.org.tab.skills")} className="flex-none gap-2.5 px-3 py-2"><SparklesIcon /><span className="hidden @lg:inline">{t("site.org.tab.skills")}</span></TabsTrigger>
        <TabsTrigger value="settings" title={t("org.tab.settings")} aria-label={t("org.tab.settings")} className="flex-none gap-2.5 px-3 py-2"><SettingsIcon /><span className="hidden @lg:inline">{t("org.tab.settings")}</span></TabsTrigger>
      </TabsList>
      <div className="min-w-0 flex-1">
        <TabsContent value="members" className="grid gap-5"><MembersSection detail={detail} /><InviteSection detail={detail} /></TabsContent>
        {manages && <TabsContent value="projects"><ProjectsSection detail={detail} /></TabsContent>}
        <TabsContent value="repositories"><RepositoriesSection detail={detail} outcome={outcome} /></TabsContent>
        <TabsContent value="policy"><PolicySection detail={detail} /></TabsContent>
        <TabsContent value="permissions"><PermissionsSection detail={detail} /></TabsContent>
        {/* A chave refaz o formulário quando o nome volta do banco. */}
        <TabsContent value="mcp"><McpSection detail={detail} /></TabsContent>
        <TabsContent value="skills"><SkillsSection detail={detail} /></TabsContent>
        <TabsContent value="settings"><SettingsSection key={detail.organization.name} organization={detail.organization} /></TabsContent>
      </div>
    </Tabs>
  );
}
