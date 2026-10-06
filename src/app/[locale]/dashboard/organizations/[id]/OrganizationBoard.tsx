"use client";

import { FolderGit2Icon, PlugIcon, SettingsIcon, ShieldCheckIcon, SparklesIcon, UsersIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/modules/i18n";
import type { OrganizationDetail } from "../data";
import { InviteSection } from "./InviteSection";
import { McpSection } from "./McpSection";
import { PolicySection } from "./PolicySection";
import { RepositoriesSection, type GitOutcome } from "./RepositoriesSection";
import { SettingsSection } from "./SettingsSection";
import { SkillsSection } from "./SkillsSection";

export type OrganizationTab = "members" | "repositories" | "policy" | "mcp" | "skills" | "settings";

/** As abas (na vertical, ao lado do conteúdo) da organização que saíram do app para o painel: convite,
 * repositórios (o provedor git do owner), política de LLM, servidores MCP, skills e configurações. */
export function OrganizationBoard({ detail, tab, outcome }: {
  detail: OrganizationDetail; tab: OrganizationTab; outcome: { kind: GitOutcome; provider: string | null; pick: boolean } | null;
}) {
  const t = useT();
  return (
    <Tabs orientation="vertical" defaultValue={tab} className="gap-3 @lg:gap-6">
      <TabsList className="sticky top-4 h-auto w-11 shrink-0 gap-0.5 py-1 pr-1 @lg:w-52">
        <TabsTrigger value="members" title={t("org.tab.members")} aria-label={t("org.tab.members")} className="flex-none gap-2.5 px-3 py-2"><UsersIcon /><span className="hidden @lg:inline">{t("org.tab.members")}</span></TabsTrigger>
        <TabsTrigger value="repositories" title={t("org.tab.repositories")} aria-label={t("org.tab.repositories")} className="flex-none gap-2.5 px-3 py-2"><FolderGit2Icon /><span className="hidden @lg:inline">{t("org.tab.repositories")}</span></TabsTrigger>
        <TabsTrigger value="policy" title={t("org.tab.policy")} aria-label={t("org.tab.policy")} className="flex-none gap-2.5 px-3 py-2"><ShieldCheckIcon /><span className="hidden @lg:inline">{t("org.tab.policy")}</span></TabsTrigger>
        <TabsTrigger value="mcp" title={t("site.org.tab.mcp")} aria-label={t("site.org.tab.mcp")} className="flex-none gap-2.5 px-3 py-2"><PlugIcon /><span className="hidden @lg:inline">{t("site.org.tab.mcp")}</span></TabsTrigger>
        <TabsTrigger value="skills" title={t("site.org.tab.skills")} aria-label={t("site.org.tab.skills")} className="flex-none gap-2.5 px-3 py-2"><SparklesIcon /><span className="hidden @lg:inline">{t("site.org.tab.skills")}</span></TabsTrigger>
        <TabsTrigger value="settings" title={t("org.tab.settings")} aria-label={t("org.tab.settings")} className="flex-none gap-2.5 px-3 py-2"><SettingsIcon /><span className="hidden @lg:inline">{t("org.tab.settings")}</span></TabsTrigger>
      </TabsList>
      <div className="min-w-0 flex-1">
        <TabsContent value="members"><InviteSection detail={detail} /></TabsContent>
        <TabsContent value="repositories"><RepositoriesSection detail={detail} outcome={outcome} /></TabsContent>
        <TabsContent value="policy"><PolicySection detail={detail} /></TabsContent>
        {/* A chave refaz o formulário quando o nome volta do banco. */}
        <TabsContent value="mcp"><McpSection detail={detail} /></TabsContent>
        <TabsContent value="skills"><SkillsSection detail={detail} /></TabsContent>
        <TabsContent value="settings"><SettingsSection key={detail.organization.name} organization={detail.organization} /></TabsContent>
      </div>
    </Tabs>
  );
}
