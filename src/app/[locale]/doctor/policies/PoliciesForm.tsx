"use client";

import { useState } from "react";
import { ToggleRow } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import type { Schemas } from "@/modules/doctor/api";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { savePolicies } from "./actions";

export function PoliciesForm({ policies }: { policies: Schemas["Policies"] }) {
  const t = useT();
  const say = useSay();
  const save = useKeyedAction();
  const [requireMfa, setRequireMfa] = useState(policies.require_mfa);
  const [saved, setSaved] = useState(false);
  const changed = requireMfa !== policies.require_mfa;

  return (
    <form className="grid max-w-2xl gap-3" onSubmit={(event) => {
      event.preventDefault();
      const next = { require_mfa: requireMfa };
      save.run((key) => savePolicies(next, key), () => setSaved(true), JSON.stringify(next));
    }}>
      <ToggleRow id="doctor-policies-mfa" label={t("site.doctor.policies.requireMfa")} hint={t("site.doctor.policies.requireMfaHint")}
        checked={requireMfa} onChange={(value) => { setSaved(false); save.reset(); setRequireMfa(value); }} />
      {save.error && <p role="alert" className="text-sm text-destructive">{say(save.error)}</p>}
      {saved && !changed && <p role="status" className="text-sm text-success">{t("site.doctor.policies.saved")}</p>}
      <div><Button type="submit" loading={save.busy} disabled={!changed}>{t("site.doctor.policies.save")}</Button></div>
    </form>
  );
}
