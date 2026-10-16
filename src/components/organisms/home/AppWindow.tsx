import { cn } from "@/lib/utils";

/** A tela do app numa janela: a mesma barra do bloco de rota do topo (o nome e
 * os três pontos) e o print embaixo, no tamanho em que o estúdio o tira
 * (1280 × 800), para a página não pular quando ele chega. Só o print do topo
 * carrega de início; os outros, quando a pessoa chega perto. */
export function AppWindow({ src, alt, label = "jayv", priority = false, className }: { src: string; alt: string; label?: string; priority?: boolean; className?: string }) {
  return (
    <figure className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}>
      <div className="flex h-9 items-center justify-between border-b border-border bg-secondary px-3 font-mono text-caption tracking-wider text-muted-foreground uppercase">
        <span>{label}</span>
        <span aria-hidden="true" className="flex gap-1.5"><i className="size-2 rounded-full bg-stop/70" /><i className="size-2 rounded-full bg-ask/70" /><i className="size-2 rounded-full bg-go/70" /></span>
      </div>
      {/* O print vem da função `mods` (o repositório de mods), não do build do site. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={1280} height={800} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" className="block h-auto w-full bg-muted" />
    </figure>
  );
}
