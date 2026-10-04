export type System = "windows" | "mac" | "linux";

export interface Asset { name: string; url: string; size: number }
export interface Release { version: string; publishedAt: string; assets: Asset[] }

/** Cada pacote de cada sistema, achado pelo nome do arquivo que o Tauri gera. */
export const PACKAGES: { system: System; label: "exe" | "msi" | "dmgArm" | "dmgIntel" | "appImage" | "deb" | "rpm"; pattern: RegExp }[] = [
  { system: "windows", label: "exe", pattern: /-setup\.exe$/i },
  { system: "windows", label: "msi", pattern: /\.msi$/i },
  { system: "mac", label: "dmgArm", pattern: /_aarch64\.dmg$/i },
  { system: "mac", label: "dmgIntel", pattern: /_x64\.dmg$/i },
  { system: "linux", label: "appImage", pattern: /\.AppImage$/i },
  { system: "linux", label: "deb", pattern: /\.deb$/i },
  { system: "linux", label: "rpm", pattern: /\.rpm$/i },
];

export const SYSTEMS: System[] = ["windows", "mac", "linux"];

/** O pacote de cada linha, sem as assinaturas (`.sig`) do atualizador. */
export function findAsset(assets: Asset[], pattern: RegExp) {
  return assets.find((asset) => pattern.test(asset.name) && !asset.name.endsWith(".sig")) ?? null;
}

/** O sistema de quem visita, pelo navegador. */
export function detectSystem(userAgent: string, platform = ""): System | null {
  const value = `${userAgent} ${platform}`.toLowerCase();
  if (value.includes("win")) return "windows";
  if (value.includes("mac")) return "mac";
  if (value.includes("linux") || value.includes("x11")) return "linux";
  return null;
}
