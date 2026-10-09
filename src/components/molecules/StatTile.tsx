import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Um número de destaque: o nome dele, o valor e, embaixo, de onde ele vem. */
export function StatTile({ label, value, hint, className }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn("grid min-w-0 content-start gap-1 rounded-lg border border-border bg-card px-4 py-3", className)}>
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-h1 font-semibold">{value}</span>
      {hint && <span className="text-xs leading-snug text-muted-foreground">{hint}</span>}
    </div>
  );
}
