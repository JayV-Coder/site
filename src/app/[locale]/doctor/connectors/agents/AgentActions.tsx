"use client";

import { useState } from "react";
import { ConfirmAction } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import type { Schemas } from "@/modules/doctor/api";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { revokeAgent, rotateAgent } from "./actions";
import { InstallCommand } from "./InstallCommand";

/** Novo token (o atual para de valer na hora) e revogar, com confirmação. */
export function AgentActions({ id, name }: { id: string; name: string }) {
  const t = useT();
  const say = useSay();
  const rotate = useKeyedAction();
  const revoke = useKeyedAction();
  const [token, setToken] = useState<Schemas["RegistrationToken"] | null>(null);
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <ConfirmAction title={t("site.doctor.agent.rotateTitle", { name })} description={t("site.doctor.agent.rotateBody")} confirm={t("site.doctor.agent.rotate")}
          onConfirm={() => rotate.run(async (key) => {
            const issued = await rotateAgent(id, key);
            if (!issued.ok) return issued.error;
            setToken(issued.value);
            return null;
          })}>
          <Button variant="outline" size="sm" loading={rotate.busy}>{t("site.doctor.agent.rotate")}</Button>
        </ConfirmAction>
        <ConfirmAction title={t("site.doctor.agent.revokeTitle", { name })} description={t("site.doctor.agent.revokeBody")} confirm={t("site.doctor.agent.revoke")}
          onConfirm={() => revoke.run((key) => revokeAgent(id, key))}>
          <Button variant="ghost" size="sm" loading={revoke.busy}>{t("site.doctor.agent.revoke")}</Button>
        </ConfirmAction>
      </div>
      {rotate.error && <p role="alert" className="text-sm text-destructive">{say(rotate.error)}</p>}
      {revoke.error && <p role="alert" className="text-sm text-destructive">{say(revoke.error)}</p>}
      {token && <InstallCommand token={token} />}
    </div>
  );
}
