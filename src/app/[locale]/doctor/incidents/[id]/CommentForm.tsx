"use client";

import { useState, useTransition } from "react";
import { FormField } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSay, useT } from "@/modules/i18n";
import type { Text } from "@/modules/i18n/types";
import { addComment } from "../actions";

export function CommentForm({ id }: { id: string }) {
  const t = useT();
  const say = useSay();
  const [body, setBody] = useState("");
  const [error, setError] = useState<Text | null>(null);
  const [busy, startBusy] = useTransition();
  return (
    <form className="grid gap-2" onSubmit={(event) => {
      event.preventDefault();
      startBusy(async () => {
        const failed = await addComment(id, body).catch((): Text => ({ key: "site.doctor.error.offline" }));
        setError(failed);
        if (failed === null) setBody("");
      });
    }}>
      <FormField label={t("site.doctor.incident.comment")} htmlFor="doctor-comment">
        <Textarea id="doctor-comment" rows={3} maxLength={4000} required value={body} onChange={(event) => setBody(event.currentTarget.value)} />
      </FormField>
      {error && <p role="alert" className="text-sm text-destructive">{say(error)}</p>}
      <Button type="submit" variant="outline" className="justify-self-start" loading={busy} disabled={body.trim() === ""}>{t("site.doctor.incident.send")}</Button>
    </form>
  );
}
