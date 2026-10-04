"use client";

import { SettingsIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/modules/i18n";
import type { OrganizationDetail } from "../data";
import { InviteSection } from "./InviteSection";
import { PolicySection } from "./PolicySection";
import { SettingsSection } from "./SettingsSection";

/** As abas da organização que saíram do app para o painel: convite, política
 * de LLM e configurações. */
export function OrganizationBoard({ detail }: { detail: OrganizationDetail }) {
  const t = useT();
  return (
    <Tabs defaultValue="members" className="gap-5">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="members" className="flex-none gap-2 px-4 py-2"><UsersIcon />{t("org.tab.members")}</TabsTrigger>
        <TabsTrigger value="policy" className="flex-none gap-2 px-4 py-2"><ShieldCheckIcon />{t("org.tab.policy")}</TabsTrigger>
        <TabsTrigger value="settings" className="flex-none gap-2 px-4 py-2"><SettingsIcon />{t("org.tab.settings")}</TabsTrigger>
      </TabsList>
      <TabsContent value="members"><InviteSection detail={detail} /></TabsContent>
      <TabsContent value="policy"><PolicySection detail={detail} /></TabsContent>
      {/* A chave refaz o formulário quando o nome volta do banco. */}
      <TabsContent value="settings"><SettingsSection key={detail.organization.name} organization={detail.organization} /></TabsContent>
    </Tabs>
  );
}
