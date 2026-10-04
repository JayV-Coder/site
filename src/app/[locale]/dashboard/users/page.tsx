import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { EmptyText, ProviderIcon, UserAvatar } from "@/components/atoms";
import { PageHeading, SubmitButton } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isProvider } from "@/modules/auth/identities";
import { getT } from "@/modules/i18n/server";
import { requireAccess } from "../access";
import { DashboardShell } from "../DashboardShell";
import { isBanned, loadUsers, PAGE_SIZE } from "./data";

export async function generateMetadata({ params }: PageProps<"/[locale]/dashboard/users">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getT(locale);
  return { title: `${t("site.users.title")} · JayV`, robots: { index: false } };
}

/** Todas as contas do JayV, para o admin do sistema: busca por e-mail, nome
 * de usuário ou nome, e cada linha abre a conta com o que dá para fazer nela. */
export default async function UsersPage({ params, searchParams }: PageProps<"/[locale]/dashboard/users">) {
  const { locale } = await params;
  const query = await searchParams;
  const access = await requireAccess(locale, "/dashboard/users");
  const t = await getT(locale);
  const search = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const page = Math.max(0, Number.parseInt(typeof query.page === "string" ? query.page : "0", 10) || 0);
  const { rows, total } = access.admin ? await loadUsers(search, page) : { rows: [], total: 0 };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const day = (iso: string | null) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso)) : "—");
  const base = `/${locale}/dashboard/users`;
  type Row = (typeof rows)[number];
  const who = (row: Row) => {
    const name = row.displayName ?? row.email ?? "?";
    return (
      <span className="flex min-w-0 items-center gap-3">
        <UserAvatar name={name} src={row.avatarUrl} className="size-8 text-sm" />
        <span className="grid min-w-0">
          <span className="flex min-w-0 items-center gap-2 font-medium">
            <span className="truncate">{name}</span>
            {row.isAdmin && <Badge variant="accent">{t("site.users.badge.admin")}</Badge>}
          </span>
          <span className="truncate text-xs text-muted-foreground">{row.username ? `@${row.username} · ` : ""}{row.email ?? "—"}</span>
        </span>
      </span>
    );
  };
  const marks = (row: Row) => (
    <span className="flex flex-wrap items-center gap-1.5">
      {isBanned(row.bannedUntil) && <Badge variant="destructive">{t("site.users.badge.banned")}</Badge>}
      {!row.emailConfirmedAt && <Badge variant="warning">{t("site.users.badge.unconfirmed")}</Badge>}
      {row.hasMfa && <Badge variant="success">{t("site.users.badge.mfa")}</Badge>}
      {row.providers.filter(isProvider).map((provider) => <ProviderIcon key={provider} provider={provider} className="size-4" />)}
    </span>
  );
  const pageHref = (target: number) => `${base}?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(target) })}`;

  return (
    <DashboardShell locale={locale} access={access} current="users">
      <PageHeading eyebrow={t("admin.eyebrow")} title={t("site.users.title")} description={t("site.users.description")} />
      {!access.admin ? <EmptyText>{t("admin.forbidden")}</EmptyText> : (
        <div className="grid gap-5">
          <Form action={base} className="flex flex-col gap-2 @lg:flex-row @lg:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
              <Input type="search" name="q" defaultValue={search} aria-label={t("site.users.search")} placeholder={t("site.users.search")} className="ps-9" />
            </div>
            <SubmitButton variant="outline">{t("site.users.searchButton")}</SubmitButton>
          </Form>
          <p className="text-sm text-muted-foreground">{t("site.users.count", { count: total })}</p>

          {rows.length === 0 ? <EmptyText>{t("site.users.empty")}</EmptyText> : (
            <>
              {/* No celular cada conta é um cartão; a tabela entra quando há largura. */}
              <ul className="grid gap-2 md:hidden">
                {rows.map((row) => (
                  <li key={row.userId}>
                    <Link href={`${base}/${row.userId}`} className="grid gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/40">
                      {who(row)}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                        <span className="font-mono text-foreground">{row.planKey ?? "—"}{row.subscriptionStatus ? ` · ${row.subscriptionStatus}` : ""}</span>
                        {marks(row)}
                      </div>
                      <dl className="grid grid-cols-2 gap-2 text-xs">
                        <div className="grid gap-0.5"><dt className="text-muted-foreground">{t("site.users.column.created")}</dt><dd>{day(row.createdAt)}</dd></div>
                        <div className="grid gap-0.5"><dt className="text-muted-foreground">{t("site.users.column.lastSignIn")}</dt><dd>{day(row.lastSignInAt)}</dd></div>
                      </dl>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-start text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("site.users.column.user")}</th>
                      <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("site.users.column.plan")}</th>
                      <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("site.users.column.access")}</th>
                      <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("site.users.column.created")}</th>
                      <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("site.users.column.lastSignIn")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.userId} className="border-t border-border/70 transition-colors hover:bg-secondary/40">
                        <td className="max-w-80 px-4 py-3"><Link href={`${base}/${row.userId}`} className="block min-w-0">{who(row)}</Link></td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs">{row.planKey ?? "—"}</span>
                          {row.subscriptionStatus && <span className="block text-xs text-muted-foreground">{row.subscriptionStatus}</span>}
                        </td>
                        <td className="px-4 py-3">{marks(row)}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{day(row.createdAt)}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">{day(row.lastSignInAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {pages > 1 && (
            <nav aria-label={t("site.users.pages")} className="flex items-center justify-between gap-3 text-sm">
              {page > 0 ? <Button asChild variant="outline" size="sm"><Link href={pageHref(page - 1)}>← {t("site.users.previous")}</Link></Button> : <span />}
              <span className="text-muted-foreground">{t("site.users.page", { page: page + 1, pages })}</span>
              {page + 1 < pages ? <Button asChild variant="outline" size="sm"><Link href={pageHref(page + 1)}>{t("site.users.next")} →</Link></Button> : <span />}
            </nav>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
