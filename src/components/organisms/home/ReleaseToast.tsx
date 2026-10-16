"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useT } from "@/modules/i18n";

export interface ToastItem { id: string; title: string; detail: string }

/** Quanto tempo cada novidade fica no aviso antes da próxima. */
const ROTATE_MS = 6000;

/** O aviso das novidades sobre a tela do topo: uma por vez. Troca sozinho,
 * para enquanto o mouse ou o foco estão nele e não troca para quem pediu menos
 * movimento; os pontos embaixo escolhem uma. */
export function ReleaseToast({ items, version, href, className }: { items: ToastItem[]; version: string; href: string; className?: string }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setStill(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (items.length < 2 || paused || still) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % items.length), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [items.length, paused, still]);

  const item = items[index] ?? items[0];
  if (!item) return null;
  return (
    <aside
      aria-label={t("site.toast.label", { version })}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-foreground bg-card p-4 text-start", className)}
    >
      <div className="min-w-0 flex-[1_1_18rem]">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          <span>{item.title}</span>
          <Badge variant="accent" mono>{t("site.toast.newIn", { version })}</Badge>
        </p>
        {item.detail && <p className="mt-0.5 line-clamp-2 text-small text-muted-foreground">{item.detail}</p>}
        {items.length > 1 && (
          <div className="mt-1 -ms-1 flex">
            {items.map((entry, position) => (
              <button
                key={entry.id} type="button" onClick={() => setIndex(position)}
                aria-label={t("site.toast.item", { index: position + 1, total: items.length })} aria-current={position === index}
                className="flex h-6 items-center px-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className={cn("h-1 rounded-full transition-all", position === index ? "w-5 bg-foreground" : "w-2 bg-border")} />
              </button>
            ))}
          </div>
        )}
      </div>
      <Link href={href} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary bg-primary px-3 text-small font-medium text-primary-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground">
        {t("site.toast.cta")}<ChevronRightIcon aria-hidden="true" className="size-3.5 rtl:rotate-180" />
      </Link>
    </aside>
  );
}
