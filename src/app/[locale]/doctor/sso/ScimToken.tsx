"use client";

import { useState } from "react";
import { ConfirmAction } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import type { Schemas } from "@/modules/doctor/api";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { rotateScimToken } from "./actions";
import { CopyValue } from "./CopyValue";

/** O token do SCIM aparece uma vez, aqui; gerar outro invalida o anterior no IdP. */
export function ScimToken({ enabled }: { enabled: boolean }) {
  const t = useT();
  const say = useSay();
  const rotate = useKeyedAction();
  const [token, setToken] = useState<Schemas["ScimToken"] | null>(null);
  const run = () => rotate.run(async (key) => {
    const result = await rotateScimToken(key);
    if (!result.ok) return result.error;
    setToken(result.value);
    return null;
  });
  // Com o SCIM ligado, gerar outro corta o IdP até ele receber o novo: pede confirmação.
  const button = (onClick?: () => void) => (
    <Button type="button" variant="outline" size="sm" className="justify-self-start" loading={rotate.busy} onClick={onClick}>
      {t(enabled ? "site.doctor.sso.scimRotate" : "site.doctor.sso.scimCreate")}
    </Button>
  );

  return (
    <section aria-labelledby="doctor-sso-scim" className="grid gap-3">
      <h2 id="doctor-sso-scim" className="text-sm font-medium text-muted-foreground">{t("site.doctor.sso.scim")}</h2>
      <p className="text-xs text-muted-foreground">{t(enabled ? "site.doctor.sso.scimOn" : "site.doctor.sso.scimHint")}</p>
      {token ? (
        <div role="status" className="grid gap-2">
          <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm">{t("site.doctor.sso.scimOnce")}</p>
          <CopyValue label={t("site.doctor.sso.scimBase")} value={token.base_url} />
          <CopyValue label={t("site.doctor.sso.scimToken")} value={token.token} />
        </div>
      ) : enabled ? (
        <ConfirmAction title={t("site.doctor.sso.scimRotateTitle")} description={t("site.doctor.sso.scimRotateBody")} confirm={t("site.doctor.sso.scimRotate")} onConfirm={run}>
          {button()}
        </ConfirmAction>
      ) : button(run)}
      {rotate.error && <p role="alert" className="text-sm text-destructive">{say(rotate.error)}</p>}
    </section>
  );
}
