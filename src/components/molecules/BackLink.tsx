import type { ReactNode } from "react";
import Link from "next/link";

/** O voltar do painel: o prompt (`❯`) do título virado para a esquerda, na
 * mesma cor verde, antes do nome da página de onde se veio. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-[1ch] text-sm text-muted-foreground transition-colors hover:text-foreground">
      <span aria-hidden="true" className="inline-block rotate-180 text-go">❯</span>
      <span>{children}</span>
    </Link>
  );
}
