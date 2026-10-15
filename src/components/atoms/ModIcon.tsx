import type { CSSProperties } from "react";
import { PuzzleIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** O SVG do ícone como endereço `data:`, para a imagem e a máscara. */
const uri = (svg: string) => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;

/** O ícone de um mod, como o catálogo o traz, igual ao do app. Nunca entra na
 * página como marcação: o desenho monocromático (`currentColor`) vira máscara
 * pintada com a cor do texto, e segue o tema; o colorido vira imagem, com as
 * cores dele. Sem ícone (ou com um que não é SVG), o `fallback` — a peça de
 * quebra-cabeça dos mods, se ninguém disser outro. */
export function ModIcon({ icon, className, title, fallback: Fallback = PuzzleIcon }: { icon?: string | null; className?: string; title?: string; fallback?: LucideIcon }) {
  const svg = icon?.trim();
  if (!svg || !svg.startsWith("<svg") || !svg.endsWith("</svg>")) return <Fallback aria-hidden="true" className={cn("shrink-0", className)} />;
  if (/currentColor/i.test(svg)) {
    const mask = uri(svg);
    const style: CSSProperties = {
      maskImage: mask, WebkitMaskImage: mask, maskSize: "contain", WebkitMaskSize: "contain",
      maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", maskPosition: "center", WebkitMaskPosition: "center",
    };
    return <span role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} data-mod-icon="mask" className={cn("inline-block shrink-0 bg-current", className)} style={style} />;
  }
  // eslint-disable-next-line @next/next/no-img-element -- um SVG em data:, sem nada para o otimizador do Next fazer
  return <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={title ?? ""} aria-hidden={title ? undefined : true} data-mod-icon="image" draggable={false} className={cn("shrink-0 object-contain", className)} />;
}
