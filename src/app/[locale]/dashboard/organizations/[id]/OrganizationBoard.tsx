"use client";

import { FolderGit2Icon, SettingsIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/modules/i18n";
import type { OrganizationDetail } from "../data";
import { InviteSection } from "./InviteSection";
import { PolicySection } from "./PolicySection";
import { RepositoriesSection, type GitOutcome } from "./RepositoriesSection";
import { SettingsSection } from "./SettingsSection";

export type OrganizationTab = "members" | "repositories" | "policy" | "settings";

/** As abas da organização que saíram do app para o painel: convite,
 * repositórios (o provedor git do owner), política de LLM e configurações. */
export function OrganizationBoard({ detail, tab, outcome }: {
  detail: OrganizationDetail; tab: OrganizationTab; outcome: { kind: GitOutcome; provider: string | null; pick: boolean } | null;
}) {
  const t = useT();
  return (
    <Tabs defaultValue={tab} className="gap-5">
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto [scrollbar-width:none] @lg:flex-wrap">
        <TabsTrigger value="members" className="flex-none gap-2 px-4 py-2"><UsersIcon />{t("org.tab.members")}</TabsTrigger>
        <TabsTrigger value="repositories" className="flex-none gap-2 px-4 py-2"><FolderGit2Icon />{t("org.tab.repositories")}</TabsTrigger>
        <TabsTrigger value="policy" className="flex-none gap-2 px-4 py-2"><ShieldCheckIcon />{t("org.tab.policy")}</TabsTrigger>
        <TabsTrigger value="settings" className="flex-none gap-2 px-4 py-2"><SettingsIcon />{t("org.tab.settings")}</TabsTrigger>
      </TabsList>
      <TabsContent value="members"><InviteSection detail={detail} /></TabsContent>
      <TabsContent value="repositories"><RepositoriesSection detail={detail} outcome={outcome} /></TabsContent>
      <TabsContent value="policy"><PolicySection detail={detail} /></TabsContent>
      {/* A chave refaz o formulário quando o nome volta do banco. */}
      <TabsContent value="settings"><SettingsSection key={detail.organization.name} organization={detail.organization} /></TabsContent>
    </Tabs>
  );
}
