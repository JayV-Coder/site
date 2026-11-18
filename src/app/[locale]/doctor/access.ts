import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMe, type Me, type Organization } from "@/modules/doctor/api";

/** O Doctor pede login: quem não entrou vai ao login e volta para `path`. */
export async function requireSession(locale: string, path: string) {
  const session = await auth();
  if (!session?.accessToken) redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}${path}`)}`);
}

export interface DoctorAccess { me: Me; active: Organization }

/** Quem entrou e a Organização ativa dele no Doctor. Sem Organização ativa (inclusive sem
 * nenhuma no Doctor), vai à página das Organizações: escolher, ativar uma do jayv-coder ou
 * criar. `null` quando a API não respondeu: a página mostra o aviso, em vez de fingir que não
 * há dados. */
export async function requireDoctor(locale: string, path: string): Promise<DoctorAccess | null> {
  await requireSession(locale, path);
  const me = await getMe();
  if (me === null) return null;
  const active = me.organizations.find(({ id }) => id === me.active_tenant_id);
  if (!active) redirect(`/${locale}/doctor/organizations`);
  return { me, active };
}
