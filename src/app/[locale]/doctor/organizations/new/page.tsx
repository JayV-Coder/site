import { redirect } from "next/navigation";

/** A criação mora na página das Organizações, junto das que já existem (ADR-0025 do
 * jayv-doctor); este endereço antigo leva para lá. */
export default async function NewDoctorOrganizationPage({ params }: PageProps<"/[locale]/doctor/organizations/new">) {
  const { locale } = await params;
  redirect(`/${locale}/doctor/organizations`);
}
