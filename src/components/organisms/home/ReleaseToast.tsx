"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useT } from "@/modules/i18n";

export interface ToastItem { id: string; title: string; detail: string }

/** Quanto tempo cada novidade fica no aviso antes da próxima. */
const ROTATE_MS = 6000;

/** A versão cujo aviso a pessoa fechou, neste navegador: o aviso volta só
 * quando sai outra. */
const DISMISSED = "jayv.site.releaseToast.dismissed";

function readDismissed(): string | null {
  try { return window.localStorage.getItem(DISMISSED); } catch { return null; }
}

function writeDismissed(version: string) {
  try { window.localStorage.setItem(DISMISSED, version); } catch { /* sem armazenamento: fecha só nesta visita */ }
}

/** O aviso das novidades da versão, fixo no pé da tela enquanto a pessoa
 * percorre a página: uma novidade por vez. Troca sozinho, para enquanto o
 * mouse ou o foco estão nele e não troca para quem pediu menos movimento; os
 * pontos escolhem uma. Fechado, não volta até a próxima versão. Só aparece
 * depois de o navegador conferir que ele não foi fechado, para não piscar. */
export function ReleaseToast({ items, version, href }: { items: ToastItem[]; version: string; href: string }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(readDismissed() !== version), [version]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setStill(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open || items.length < 2 || paused || still) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % items.length), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [open, items.length, paused, still]);

  const close = () => {
    writeDismissed(version);
    setOpen(false);
  };

  const item = items[index] ?? items[0];
  if (!item || !open) return null;
  return (
    <aside
      aria-label={t("site.toast.label", { version })}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-xl flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-foreground bg-card py-3.5 ps-4 pe-12 text-start motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4"
    >
      <div className="min-w-0 flex-[1_1_16rem]">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          <span>{item.title}</span>
          <Badge variant="accent" mono>{t("site.toast.newIn", { version })}</Badge>
        </p>
        {/* No celular, só o título: o aviso fixo não cobre a tela. */}
        {item.detail && <p className="mt-0.5 line-clamp-2 text-small text-muted-foreground max-sm:hidden">{item.detail}</p>}
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
      <button
        type="button" onClick={close} aria-label={t("common.close")} title={t("common.close")}
        className="absolute end-2 top-2 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <XIcon aria-hidden="true" className="size-4" />
      </button>
    </aside>
  );
}
