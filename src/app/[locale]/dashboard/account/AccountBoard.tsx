"use client";

import { LinkIcon, ShieldCheckIcon, UserRoundIcon } from "lucide-react";
import { EmptyText } from "@/components/atoms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/modules/i18n";
import type { AccountData } from "./data";
import { LinkedSection, type LinkResult } from "./LinkedSection";
import { ProfileSection } from "./ProfileSection";
import { SecuritySection } from "./SecuritySection";

export type AccountTab = "data" | "security" | "linked";

/** As três abas da conta, como na página de Perfil do app. */
export function AccountBoard({ account, tab, result }: {
  account: AccountData; tab: AccountTab; result: { kind: LinkResult; provider: string | null } | null;
}) {
  const t = useT();
  return (
    <Tabs defaultValue={tab} className="gap-5">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="data" className="flex-none gap-2 px-4 py-2"><UserRoundIcon />{t("profile.tab.data")}</TabsTrigger>
        <TabsTrigger value="security" className="flex-none gap-2 px-4 py-2"><ShieldCheckIcon />{t("profile.tab.security")}</TabsTrigger>
        <TabsTrigger value="linked" className="flex-none gap-2 px-4 py-2"><LinkIcon />{t("profile.tab.linked")}</TabsTrigger>
      </TabsList>
      <TabsContent value="data">
        {account.profile ? <ProfileSection initial={account.profile} /> : <EmptyText>{t("site.account.noProfile")}</EmptyText>}
      </TabsContent>
      <TabsContent value="security">
        <SecuritySection email={account.email} hasPassword={account.hasPassword} totpFactorId={account.totpFactorId} />
      </TabsContent>
      <TabsContent value="linked">
        <LinkedSection providers={account.providers} hasPassword={account.hasPassword} result={result} />
      </TabsContent>
    </Tabs>
  );
}
