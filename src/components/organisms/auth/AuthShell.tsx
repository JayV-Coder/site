import type { ReactNode } from "react";
import { BrandMark } from "@/components/atoms";

/** A moldura das telas de entrada, igual à porta do app: a marca, o título e
 * o formulário numa coluna estreita. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid flex-1 place-items-center px-4 py-12">
      <div className="grid w-full max-w-sm gap-6">
        <div className="grid justify-items-center gap-3 text-center">
          <BrandMark />
          <h1 className="text-h3 font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
