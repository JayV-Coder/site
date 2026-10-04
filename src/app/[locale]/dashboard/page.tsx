import { redirect } from "next/navigation";
import { requireAccess } from "./access";

/** O painel abre na conta de quem entrou, que todo mundo tem. */
export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  await requireAccess(locale, "/dashboard");
  redirect(`/${locale}/dashboard/account`);
}
