"use client";

import { useEffect } from "react";

/** No celular as seções do painel rolam de lado: a seção aberta entra na
 * vista ao carregar, para não ficar escondida além da borda. */
export function CurrentInView({ nav }: { nav: string }) {
  useEffect(() => {
    const strip = document.getElementById(nav);
    const current = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!strip || !current || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollLeft = current.offsetLeft - (strip.clientWidth - current.offsetWidth) / 2;
  }, [nav]);
  return null;
}
