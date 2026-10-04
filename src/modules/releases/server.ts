import "server-only";
import { cache } from "react";
import { RELEASES_REPOSITORY } from "./config";
import type { Release } from "./assets";

/** A última versão publicada, lida do GitHub no servidor e guardada por dez
 * minutos (a API sem token aceita 60 pedidos por hora por IP). Sem rede, nulo:
 * a página mostra os links de "latest" sem número de versão. */
export const latestRelease = cache(async (): Promise<Release | null> => {
  try {
    const response = await fetch(`https://api.github.com/repos/${RELEASES_REPOSITORY}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 600 },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { tag_name: string; published_at: string; assets: { name: string; browser_download_url: string; size: number }[] };
    return {
      version: data.tag_name.replace(/^v/, ""),
      publishedAt: data.published_at,
      assets: data.assets.map((asset) => ({ name: asset.name, url: asset.browser_download_url, size: asset.size })),
    };
  } catch (error) {
    console.error("releases", error);
    return null;
  }
});
