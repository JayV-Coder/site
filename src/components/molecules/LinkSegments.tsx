import Link from "next/link";
import { cn } from "@/lib/utils";

/** O mesmo grupo do `SegmentedControl`, feito de links: a escolha mora no
 * endereço (`?days=7`) e a página é desenhada no servidor. */
export function LinkSegments({ label, options }: { label: string; options: { href: string; label: string; current: boolean }[] }) {
  return (
    <nav aria-label={label} className="inline-flex w-fit rounded-md border border-border bg-secondary p-0.5">
      {options.map((option) => (
        <Link
          key={option.href}
          href={option.href}
          scroll={false}
          aria-current={option.current ? "page" : undefined}
          className={cn(
            "flex h-7 items-center rounded-sm border border-transparent px-2.5 text-xs font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            option.current && "border-border bg-card text-foreground",
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
