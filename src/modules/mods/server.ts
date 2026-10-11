import "server-only";
import { cache } from "react";
import { SUPABASE_KEY } from "@/modules/supabase/config";
import { MODS_API } from "./config";
import { readCatalog, type Catalog } from "./rules";

/** Quanto tempo o catálogo vale no cache do Next antes de pedir de novo. A
 * própria função guarda o repositório por cinco minutos. */
const REVALIDATE = 300;

/** O catálogo dos mods, como a função o entrega. Sem rede ou com um formato
 * que o site não entende, nulo: a página mostra só os mods da pessoa. */
export const modCatalog = cache(async (): Promise<Catalog | null> => {
  try {
    const response = await fetch(`${MODS_API}/catalog`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      next: { revalidate: REVALIDATE, tags: ["mods"] },
    });
    if (!response.ok) return null;
    return readCatalog(await response.json());
  } catch (error) {
    console.error("mods catalog", error);
    return null;
  }
});
