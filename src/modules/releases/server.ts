import "server-only";
import { cache } from "react";
import { SUPABASE_KEY } from "@/modules/supabase/config";
import { RELEASES_API } from "./config";
import type { Release } from "./assets";
import type { ChangeRelease, Manual } from "./content";

/** Quanto tempo a resposta da função vale no cache do Next antes de pedir de
 * novo. A própria função guarda o GitHub por cinco minutos. */
const REVALIDATE = 300;

async function read<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${RELEASES_API}${path}`, {
      headers: { apikey: SUPABASE_KEY },
      next: { revalidate: REVALIDATE, tags: ["releases"] },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.error("releases", path, error);
    return null;
  }
}

/** A última versão publicada, com os links de download pela função. Sem
 * rede, nulo: a página mostra os cartões sem número de versão. */
export const latestRelease = cache(async (): Promise<Release | null> => {
  const release = await read<Release>("/latest");
  return release && typeof release.version === "string" && Array.isArray(release.assets) ? release : null;
});

/** Tudo que cada versão trouxe, da mais nova para a mais antiga. */
export const changelog = cache(async (): Promise<ChangeRelease[] | null> => {
  const data = await read<{ releases?: ChangeRelease[] }>("/changelog");
  return Array.isArray(data?.releases) ? data.releases : null;
});

/** A documentação: as funcionalidades e os comandos do app. */
export const manual = cache(async (): Promise<Manual | null> => {
  const data = await read<Manual>("/manual");
  return data && Array.isArray(data.features) && Array.isArray(data.commands) ? data : null;
});
