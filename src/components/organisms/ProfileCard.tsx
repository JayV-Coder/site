import type { ReactNode } from "react";
import { PROVIDER_NAMES, ProviderIcon, UserAvatar } from "@/components/atoms";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { isProvider, PROVIDERS } from "@/modules/auth/identities";
import type { Key } from "@/modules/i18n";
import { getT } from "@/modules/i18n/server";

export interface ProfileCardData {
  name: string;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  /** O provedor do último login; nulo quando não se sabe. */
  lastProvider: string | null;
  hasPassword: boolean;
  /** As identidades da conta (`email`, `github`, `gitlab`, `bitbucket`). */
  providers: string[];
  expertise: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
}

/** O nome que se mostra: o do perfil, o do provedor ou o começo do e-mail. */
export const cardName = (profileName: string | null | undefined, providerName: string | null | undefined, email: string | null | undefined) =>
  profileName || providerName || email?.split("@")[0] || "";

/** Quem é a conta: foto, nome, e-mail, como entra e desde quando — o cartão do
 * topo do Perfil do app. `badges` entra junto das marcas (admin, bloqueada),
 * `action` à direita (sair, na própria conta) e `avatar` no lugar da foto
 * (o editor da foto, na própria conta). */
export async function ProfileCard({ locale, data, badges, action, avatar }: {
  locale: string; data: ProfileCardData; badges?: ReactNode; action?: ReactNode; avatar?: ReactNode;
}) {
  const t = await getT(locale);
  const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(iso)) : null);
  const since = date(data.createdAt);
  const last = date(data.lastSignInAt);
  const linked = PROVIDERS.filter((provider) => data.providers.includes(provider));
  const provider = data.lastProvider === null ? null : isProvider(data.lastProvider) ? PROVIDER_NAMES[data.lastProvider] : t("profile.provider.email");

  return (
    <Card className="relative mb-6 gap-0 overflow-hidden p-0">
      <div aria-hidden="true" className="h-20 border-b border-border bg-secondary" />
      <div className="flex flex-col items-start gap-4 px-4 pb-5 @lg:flex-row @lg:items-end @lg:gap-5 @lg:px-7 @lg:pb-6">
        {avatar ?? <UserAvatar name={data.name} src={data.avatarUrl} className="-mt-10 size-[84px] border-4 border-card text-h1" />}
        <div className="w-full min-w-0 @lg:w-auto @lg:flex-1">
          <h1 className="truncate text-h2 font-semibold">{data.name}</h1>
          {(data.username || data.email) && (
            <p className="truncate text-sm text-muted-foreground">
              {data.username && <span className="font-mono text-foreground/80">@{data.username}</span>}
              {data.username && data.email && <span aria-hidden="true"> · </span>}
              {data.email}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {provider && <Badge variant="outline">{t("profile.provider", { provider })}</Badge>}
            {data.hasPassword && <Badge variant="outline">{t("profile.password")}</Badge>}
            {linked.map((linkedProvider) => (
              <Badge key={linkedProvider} variant="outline"><ProviderIcon provider={linkedProvider} />{PROVIDER_NAMES[linkedProvider]}</Badge>
            ))}
            {data.expertise && <Badge variant="outline" className="border-muted-foreground/50 text-success">{t(`expertise.${data.expertise}` as Key)}</Badge>}
            {badges}
          </div>
        </div>
        {action}
      </div>
      {(since || last) && (
        <dl className="grid gap-x-8 gap-y-1 border-t border-border/60 px-4 py-3.5 text-xs @xl:grid-cols-2 @lg:px-7">
          {since && <div className="flex flex-wrap gap-x-2"><dt className="text-muted-foreground">{t("profile.memberSince")}</dt><dd>{since}</dd></div>}
          {last && <div className="flex flex-wrap gap-x-2"><dt className="text-muted-foreground">{t("profile.lastSignIn")}</dt><dd>{last}</dd></div>}
        </dl>
      )}
    </Card>
  );
}
