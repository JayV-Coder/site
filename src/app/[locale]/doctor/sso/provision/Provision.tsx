"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OFFLINE } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { provisionSso, signInAgain } from "./actions";

export function Provision({ locale, next }: { locale: string; next: string }) {
  const t = useT();
  const say = useSay();
  const router = useRouter();
  const [error, setError] = useState<Text | null>(null);
  const [round, setRound] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    // Uma vez por tentativa (o modo estrito do React roda o efeito duas vezes).
    if (started.current === round) return;
    started.current = round;
    void provisionSso().catch(() => OFFLINE).then((failed) => {
      if (failed) setError(failed);
      else router.replace(next);
    });
  }, [round, next, router]);

  if (!error) return <p role="status" className="text-sm text-muted-foreground">{t("site.doctor.ssoLogin.provisioning")}</p>;
  return (
    <div className="grid justify-items-start gap-3">
      <p role="alert" className="text-sm text-destructive">{say(error)}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => { setError(null); setRound((value) => value + 1); }}>{t("site.doctor.ssoLogin.retry")}</Button>
        <Button type="button" variant="outline" onClick={() => void signInAgain(locale)}>{t("site.doctor.ssoLogin.other")}</Button>
      </div>
    </div>
  );
}
