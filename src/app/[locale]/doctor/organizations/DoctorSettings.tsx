"use client";

import { useState } from "react";
import { FormField, SegmentedControl } from "@/components/molecules";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEGMENTS } from "@/modules/doctor/segments";
import type { Key } from "@/modules/i18n";
import { useT } from "@/modules/i18n";
import type { DoctorSettings, Provider, Segment } from "./actions";

/** O que o Doctor pede de uma Organização, para criar uma nova ou ativar numa que já existe:
 * segmento, perfil de IA e o aceite do DPA. `id` prefixa os campos (há um formulário por
 * Organização na página). */
export function useDoctorSettings() {
  const [segment, setSegment] = useState<Segment | "">("");
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [accepted, setAccepted] = useState(false);
  const settings: DoctorSettings | null = segment !== "" && accepted
    ? { segment, llmProvider: provider, dpaAccepted: true }
    : null;
  return { segment, setSegment, provider, setProvider, accepted, setAccepted, settings };
}

export function DoctorSettingsFields({ id, state }: { id: string; state: ReturnType<typeof useDoctorSettings> }) {
  const t = useT();
  const segments = SEGMENTS.map((value) => ({ value, label: t(`site.doctor.org.segment.${value}` as Key) }));
  return (
    <>
      <FormField label={t("site.doctor.org.segment")} htmlFor={`${id}-segment`}>
        <Select value={state.segment || undefined} onValueChange={(value) => state.setSegment(value as Segment)}>
          <SelectTrigger id={`${id}-segment`} className="w-full min-w-0">
            <SelectValue placeholder={t("site.doctor.org.segment.pick")} />
          </SelectTrigger>
          <SelectContent>
            {segments.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label={t("site.doctor.org.ai")} hint={state.provider === "anthropic" ? t("site.doctor.org.ai.anthropicHint") : t("site.doctor.org.ai.vertexHint")}>
        <SegmentedControl label={t("site.doctor.org.ai")} value={state.provider} onChange={state.setProvider}
          options={[
            { value: "anthropic", label: t("site.doctor.org.ai.anthropic") },
            { value: "vertex", label: t("site.doctor.org.ai.vertex") },
          ]} />
      </FormField>
      <div className="flex items-start gap-2.5">
        <Checkbox id={`${id}-dpa`} checked={state.accepted} onCheckedChange={(value) => state.setAccepted(value === true)} className="mt-0.5" />
        <Label htmlFor={`${id}-dpa`} className="text-sm leading-snug font-normal">{t("site.doctor.org.dpa")}</Label>
      </div>
    </>
  );
}
