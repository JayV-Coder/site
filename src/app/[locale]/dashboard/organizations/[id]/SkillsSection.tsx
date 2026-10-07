"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { ConfirmAction, FormField, SettingsSection } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useFeedback } from "@/modules/feedback";
import { useT } from "@/modules/i18n";
import { parseSkillFile, skillFile, skillProblems, SKILL_BODY_MAX, type OrgSkill } from "@/modules/organizations/extensions";
import { canManage } from "@/modules/organizations/rules";
import type { SkillHit } from "@/modules/organizations/skillsHub";
import { installHubSkill, removeSkill, saveSkill, searchSkillHub, type ActionResult } from "../actions";
import type { OrganizationDetail } from "../data";

/** As skills que a organização dá aos membros: o `SKILL.md` de cada uma
 * (o formato das skills do Claude) desce para o app, onde o Jev escolhe uma
 * por pedido. Todo membro vê a lista; owner e maintainer a editam. */
export function SkillsSection({ detail }: { detail: OrganizationDetail }) {
  const t = useT();
  const router = useRouter();
  const { notify, report } = useFeedback();
  const orgId = detail.organization.id;
  const manages = canManage(detail.organization.role);
  // O texto do `SKILL.md` em edição; nulo com o formulário fechado.
  const [text, setText] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  // A busca no skills.sh: `null` antes da primeira.
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SkillHit[] | null>(null);

  const run = (action: () => Promise<ActionResult<null>>, done: string, after?: () => void) => startBusy(async () => {
    const result = await action();
    if (!result.ok) { report(result.error); return; }
    notify(done);
    after?.();
    router.refresh();
  });

  const parsed = text === null ? null : parseSkillFile(text);
  const existing = parsed ? detail.skills.find((skill) => skill.name === parsed.name) : undefined;
  const problems = parsed ? skillProblems(parsed) : [];
  const valid = parsed !== null && problems.length === 0 && (text?.length ?? 0) <= SKILL_BODY_MAX + 2000;
  const submit = () => {
    if (!parsed || !valid) return;
    run(() => saveSkill(orgId, { ...parsed, enabled: existing?.enabled ?? true }), t("site.org.skills.saved"), () => setText(null));
  };

  const search = () => startBusy(async () => {
    const result = await searchSkillHub(query);
    if (!result.ok) { report(result.error); return; }
    setHits(result.data);
  });

  return (
    <div className="grid gap-5">
      <SettingsSection title={t("site.org.skills.title")} description={t("site.org.skills.description")}
        action={manages && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setText("")}><PlusIcon aria-hidden="true" />{t("site.org.skills.add")}</Button>}>
        {detail.skills.length === 0 ? <p className="text-sm text-muted-foreground">{t("site.org.skills.empty")}</p> : (
          <ul className="grid gap-2">
            {detail.skills.map((skill: OrgSkill) => (
              <li key={skill.name} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2">
                <Switch checked={skill.enabled} disabled={!manages || busy} aria-label={t("site.org.skills.enabled", { name: skill.name })}
                  onCheckedChange={(enabled) => run(() => saveSkill(orgId, { ...skill, enabled }), t("site.org.skills.saved"))} />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <span className="text-sm font-medium">{skill.name}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{skill.description}</span>
                </div>
                {manages && (
                  <>
                    <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label={t("site.org.skills.edit", { name: skill.name })} title={t("site.org.skills.edit", { name: skill.name })}
                      onClick={() => setText(skillFile(skill))}><PencilIcon aria-hidden="true" /></Button>
                    <ConfirmAction title={t("site.org.skills.delete.title", { name: skill.name })} description={t("site.org.skills.delete.description")}
                      onConfirm={() => run(() => removeSkill(orgId, skill.name), t("site.org.skills.deleted"))}>
                      <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label={t("site.org.skills.delete", { name: skill.name })} title={t("site.org.skills.delete", { name: skill.name })}><Trash2Icon aria-hidden="true" /></Button>
                    </ConfirmAction>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs leading-snug text-muted-foreground">{t("site.org.skills.notes")}</p>
      </SettingsSection>

      {manages && (
        <SettingsSection title={t("site.org.skills.hub.title")} description={t("site.org.skills.hub.description")}>
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); search(); }}>
            <Input value={query} placeholder={t("site.org.skills.hub.placeholder")} aria-label={t("site.org.skills.hub.placeholder")} onChange={(event) => setQuery(event.target.value)} />
            <Button type="submit" variant="outline" disabled={busy || query.trim().length < 2}><SearchIcon aria-hidden="true" />{t("site.org.skills.hub.search")}</Button>
          </form>
          {hits !== null && (hits.length === 0 ? <p className="text-sm text-muted-foreground">{t("site.org.skills.hub.none")}</p> : (
            <ul className="grid gap-2">
              {hits.map((hit) => (
                <li key={hit.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2">
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <span className="text-sm font-medium">{hit.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{hit.source} · {t("site.org.skills.hub.installs", { count: hit.installs })}</span>
                  </div>
                  <Button type="button" size="sm" variant="outline" disabled={busy}
                    onClick={() => run(() => installHubSkill(orgId, hit.source, hit.name), t("site.org.skills.hub.installed", { name: hit.name }))}>
                    <DownloadIcon aria-hidden="true" />{t(detail.skills.some((skill) => skill.name === hit.name) ? "site.org.skills.hub.reinstall" : "site.org.skills.hub.install")}
                  </Button>
                </li>
              ))}
            </ul>
          ))}
          <p className="text-xs leading-snug text-muted-foreground">{t("site.org.skills.hub.notes")}</p>
        </SettingsSection>
      )}

      {manages && text !== null && (
        <SettingsSection title={t("site.org.skills.form.title")} description={t("site.org.skills.form.description")}>
          <FormField label="SKILL.md" htmlFor="skill-file"
            error={text.trim() && !parsed ? t("site.org.skills.invalid.header") : parsed && problems.length > 0 ? t(`site.org.skills.invalid.${problems[0]}`) : existing ? t("site.org.skills.replaces", { name: existing.name }) : null}>
            <Textarea id="skill-file" rows={12} value={text} spellCheck={false} placeholder={t("site.org.skills.placeholder")} className="font-mono text-xs" onChange={(event) => setText(event.target.value)} />
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy || !valid} onClick={submit}>{t("site.org.skills.save")}</Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setText(null)}>{t("common.cancel")}</Button>
          </div>
        </SettingsSection>
      )}
    </div>
  );
}
