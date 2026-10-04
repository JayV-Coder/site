"use client";

import Link from "next/link";
import { BrandMark } from "@/components/atoms";
import { Button } from "@/components/ui/button";
import { useHref, useT } from "@/modules/i18n";

export default function NotFound() {
  const t = useT();
  const href = useHref();
  return (
    <main className="grid flex-1 place-items-center px-4 py-20">
      <div className="grid max-w-sm justify-items-center gap-3 text-center">
        <BrandMark />
        <h1 className="text-h3"><span aria-hidden="true" className="text-stop">✗ </span>{t("site.notFound.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("site.notFound.detail")}</p>
        <Button asChild variant="outline"><Link href={href("/")}>{t("site.notFound.home")}</Link></Button>
      </div>
    </main>
  );
}
