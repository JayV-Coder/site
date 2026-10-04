import type { ReactNode } from "react";
import { Eyebrow } from "@/components/atoms";

/** Título de uma página: onde se está, o nome dela depois do prompt (`❯`) e,
 * à direita, o que se pode fazer nela. Igual ao do app. */
export function PageHeading({ eyebrow, title, description, children }: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="flex min-w-0 gap-[1ch] text-h2 font-semibold"><span aria-hidden="true" className="text-go">❯</span><span className="break-words">{title}</span></h1>
        {description && <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
