import type { Metadata } from "next";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { EmptyText, PROVIDER_NAMES } from "@/components/atoms";
import { BackLink, SettingsSection } from "@/components/molecules";
import { cardName, ProfileCard } from "@/components/organisms/ProfileCard";
import { Badge } from "@/components/ui/badge";
import { isProvider } from "@/modules/auth/identities";
import type { Key } from "@/modules/i18n";
import { getT } from "@/modules/i18n/server";
import { requireAccess } from "../../access";
import { DashboardShell } from "../../DashboardShell";
import { isBanned, loadUser } from "../data";
import { UserActions } from "./UserActions";
import { UserProfileEditor } from "./UserProfileEditor";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/users/[id]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.users.title")} · JayV`, robots: { index: false } };
}

/** Os campos do perfil que a página mostra, com o grupo de tradução dos que
 * são escolha fechada (`profile.sex.female`). */
const PROFILE_FIELDS: [column: string, label: Key, group?: string][] = [
  ["sex", "profile.field.sex", "sex"],
  ["gender", "profile.field.gender", "gender"],
  ["gender_custom", "profile.field.genderCustom"],
  ["pronouns", "profile.field.pronouns", "pronouns"],
  ["pronouns_custom", "profile.field.pronounsCustom"],
  ["birth_date", "profile.field.birthDate"],
  ["country", "profile.field.country"],
  ["timezone", "profile.field.timezone"],
  ["role", "profile.field.role", "role"],
  ["company", "profile.field.company"],
];

function Facts({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 @xl:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="grid min-w-0 gap-0.5">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="min-w-0 text-sm break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Uma conta, para o admin: tudo que o banco sabe dela e o que dá para fazer
 * com ela. Cada ação passa por uma função `admin_*` e fica no registro. */
export default async function UserPage({ params }: PageProps<"/[locale]/dashboard/users/[id]">) {
  const { locale, id } = await params;
  const access = await requireAccess(locale, `/dashboard/users/${id}`);
  const t = await getT(locale);
  const session = await auth();
  const user = access.admin && /^[0-9a-f-]{36}$/i.test(id) ? await loadUser(id) : null;
  const day = (iso: string | null) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "—");
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const money = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
  const yes = (value: boolean) => (value ? t("site.users.yes") : t("site.users.no"));
  const back = <BackLink href={`/${locale}/dashboard/users`}>{t("site.users.back")}</BackLink>;

  if (!user) {
    return (
      <DashboardShell locale={locale} access={access} current="users">
        <div className="mb-4">{back}</div>
        <EmptyText>{access.admin ? t("site.users.notFound") : t("admin.forbidden")}</EmptyText>
      </DashboardShell>
    );
  }

  const profile = user.profile;
  const banned = isBanned(user.bannedUntil);
  const self = session?.user.id === user.userId;
  const choice = (column: string, group?: string) => {
    const value = profile?.[column] ?? null;
    if (!value) return "—";
    if (column === "country") return new Intl.DisplayNames([locale], { type: "region", fallback: "code" }).of(value) ?? value;
    return group ? t(`profile.${group}.${value}` as Key) : value;
  };

  return (
    <DashboardShell locale={locale} access={access} current="users">
      <div className="mb-4">{back}</div>
      <ProfileCard locale={locale}
        data={{
          name: cardName(profile?.display_name, null, user.email),
          username: profile?.username ?? null,
          email: user.email,
          avatarUrl: profile?.avatar_url ?? null,
          lastProvider: user.lastProvider,
          hasPassword: user.hasPassword,
          providers: user.providers.map((item) => item.provider),
          expertise: user.expertise,
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt,
        }}
        badges={(
          <>
            {user.isAdmin && <Badge variant="accent">{t("site.users.badge.admin")}</Badge>}
            {banned && <Badge variant="destructive">{t("site.users.badge.banned")}</Badge>}
            {!user.emailConfirmedAt && <Badge variant="warning">{t("site.users.badge.unconfirmed")}</Badge>}
            {user.hasMfa && <Badge variant="success">{t("site.users.badge.mfa")}</Badge>}
            {self && <Badge variant="outline">{t("org.members.you")}</Badge>}
          </>
        )} />

      <div className="grid gap-5">
        <UserActions user={{ id: user.userId, email: user.email, isAdmin: user.isAdmin, banned, confirmed: !!user.emailConfirmedAt, hasMfa: user.hasMfa, self }} />

        <SettingsSection title={t("site.users.section.access")}>
          <Facts items={[
            [t("site.users.field.created"), day(user.createdAt)],
            [t("site.users.field.lastSignIn"), day(user.lastSignInAt)],
            [t("site.users.field.emailConfirmed"), day(user.emailConfirmedAt)],
            [t("site.users.field.bannedUntil"), banned ? day(user.bannedUntil) : "—"],
            [t("site.users.field.password"), yes(user.hasPassword)],
            [t("site.users.field.mfa"), yes(user.hasMfa)],
            [t("site.users.field.sessions"), number(user.sessions)],
            [t("site.users.field.providers"), user.providers.length
              ? user.providers.map((item) => (isProvider(item.provider) ? PROVIDER_NAMES[item.provider] : item.provider)).join(", ")
              : "—"],
            [t("site.users.field.id"), <span key="id" className="font-mono text-xs">{user.userId}</span>],
          ]} />
        </SettingsSection>

        <SettingsSection title={t("profile.data.title")}>
          {profile ? (
            <>
              <Facts items={PROFILE_FIELDS.map(([column, label, group]) => [t(label), choice(column, group)])} />
              <UserProfileEditor target={user.userId} displayName={profile.display_name ?? ""} username={profile.username ?? ""} locked={!!profile.username_set_at} />
            </>
          ) : <EmptyText>{t("site.account.noProfile")}</EmptyText>}
        </SettingsSection>

        <SettingsSection title={t("site.users.section.plan")}>
          <Facts items={[
            [t("site.users.field.plan"), <span key="plan" className="font-mono">{user.planKey ?? "—"}</span>],
            [t("site.users.field.subscription"), user.subscription ? `${user.subscription.status}${user.subscription.cancelAtPeriodEnd ? ` · ${t("site.users.cancelAtPeriodEnd")}` : ""}` : t("site.users.noSubscription")],
            [t("site.users.field.periodEnd"), day(user.subscription?.currentPeriodEnd ?? null)],
            [t("site.users.field.stripe"), <span key="stripe" className="font-mono text-xs">{[user.stripeCustomerId, user.subscription?.stripeSubscriptionId].filter(Boolean).join(" · ") || "—"}</span>],
          ]} />
          <p className="text-xs text-muted-foreground">{t("site.users.planNote")}</p>
        </SettingsSection>

        <SettingsSection title={t("site.users.section.usage")}>
          <Facts items={[
            [t("site.users.field.projects"), number(user.usage.projects)],
            [t("site.users.field.chats"), number(user.usage.chats)],
            [t("site.users.field.calls30d"), number(user.usage.calls30d)],
            [t("site.users.field.tokens30d"), number(user.usage.tokens30d)],
            [t("site.users.field.cost30d"), money(user.usage.cost30d)],
            [t("site.users.field.costTotal"), money(user.usage.costTotal)],
          ]} />
        </SettingsSection>

        <SettingsSection title={t("nav.organizations")}>
          {user.organizations.length === 0 ? <EmptyText>{t("site.users.noOrganizations")}</EmptyText> : (
            <ul className="grid gap-2">
              {user.organizations.map((org) => (
                <li key={org.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border/60 px-3 py-2.5">
                  <span className="min-w-0 basis-full truncate text-sm font-medium @lg:basis-auto @lg:flex-1">{org.name} <span className="font-mono text-xs text-muted-foreground">@{org.slug}</span></span>
                  <Badge variant="outline">{t(`org.role.${org.role}` as Key)}</Badge>
                  <span className="text-xs text-muted-foreground">{t("org.count.members", { count: org.members })}</span>
                </li>
              ))}
            </ul>
          )}
        </SettingsSection>

        <SettingsSection title={t("site.users.section.audit")} description={t("site.users.auditNote")}>
          {user.audit.length === 0 ? <EmptyText>{t("site.users.noAudit")}</EmptyText> : (
            <ul className="grid gap-2">
              {user.audit.map((entry, index) => (
                <li key={`${entry.createdAt}-${index}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/50 pb-2 text-sm last:border-0 last:pb-0">
                  <span className="min-w-0 basis-full break-words @lg:basis-auto @lg:flex-1">{t(`site.users.audit.${entry.action}` as Key)}</span>
                  <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">{entry.admin ? `@${entry.admin}` : "—"}</span>
                  <span className="text-xs text-muted-foreground">{day(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </SettingsSection>
      </div>
    </DashboardShell>
  );
}
