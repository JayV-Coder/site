import { redirect } from "next/navigation";

/** A Administração mudou para dentro do painel; o endereço antigo continua
 * levando até ela. */
export default async function AdminRedirect({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/admin`);
}
