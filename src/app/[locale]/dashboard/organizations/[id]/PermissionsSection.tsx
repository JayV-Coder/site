"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormField, OptionSelect, SettingsSection } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useFeedback } from "@/modules/feedback";
import { useT } from "@/modules/i18n";
import { COMMAND_CATALOG, inCatalog, ruleLines, rulesInvalid } from "@/modules/organizations/commands";
import { canManage } from "@/modules/organizations/rules";
import { saveCommandRules } from "../actions";
import type { OrganizationDetail } from "../data";

/** O escopo da organização inteira no seletor; os outros são ids de repositório. */
const WHOLE = "org";

/** Os comandos que os agentes nunca rodam nos projetos da organização, para
 * ela inteira e, mais apertado, para cada repositório. O repositório só
 * bloqueia a mais: o que a organização bloqueou aparece marcado e travado.
 * Quem é member vê a tela desativada. */
export function PermissionsSection({ detail }: { detail: OrganizationDetail }) {
  const t = useT();
  const [scope, setScope] = useState(WHOLE);
  const manages = canManage(detail.organization.role);
  const repository = scope === WHOLE ? null : scope;
  const rulesOf = (id: string | null) => detail.commandRules.find((item) => item.repositoryId === id)?.blocked ?? null;
  const stored = rulesOf(repository);
  const inherited = repository ? rulesOf(null) ?? [] : [];
  const options = [
    { value: WHOLE, label: t("policy.scope.org"), hint: t(rulesOf(null)?.length ? "site.perm.scope.set" : "site.perm.scope.unset") },
    ...detail.repositories.map((item) => ({ value: item.id, label: item.repoKey, hint: t(rulesOf(item.id)?.length ? "site.perm.scope.set" : "site.perm.scope.unset") })),
  ];

  return (
    <div className="grid gap-5">
      <SettingsSection title={t("site.perm.title")} description={t("site.perm.description")}>
        <FormField label={t("policy.scope")} htmlFor="perm-scope" hint={repository ? t("site.perm.repoNote") : undefined}>
          <OptionSelect id="perm-scope" value={scope} options={options} onChange={setScope} />
        </FormField>
        {!manages && <p className="text-xs text-muted-foreground">{t("policy.readOnly")}</p>}
      </SettingsSection>
      {/* A chave troca o formulário quando o escopo muda ou as regras gravadas voltam do banco. */}
      <RulesForm key={`${scope}:${(stored ?? []).join("|")}`} orgId={detail.organization.id} repository={repository} initial={stored ?? []} inherited={inherited} manages={manages} />
    </div>
  );
}

function RulesForm({ orgId, repository, initial, inherited, manages }: {
  orgId: string; repository: string | null; initial: string[]; inherited: string[]; manages: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const { notify, report } = useFeedback();
  // O catálogo marca o que ele conhece; o resto vai para o campo de texto.
  const [picked, setPicked] = useState<string[]>(() => initial.filter(inCatalog));
  const [other, setOther] = useState(initial.filter((rule) => !inCatalog(rule)).join("\n"));
  const [busy, startBusy] = useTransition();
  const rules = [...new Set([...picked, ...ruleLines(other)])];
  const invalid = rulesInvalid(rules);
  // Uma regra do programa vale para todos os subcomandos dele.
  const covered = (rule: string, set: string[]) => set.includes(rule) || set.includes(rule.split(" ")[0]);

  const toggle = (rule: string, on: boolean) => setPicked((current) => {
    const tool = rule.split(" ")[0];
    // Marcar o programa solta os subcomandos já marcados: ele os cobre.
    if (on && rule === tool) return [...current.filter((item) => item.split(" ")[0] !== tool), tool];
    return on ? [...current, rule] : current.filter((item) => item !== rule);
  });

  const save = () => startBusy(async () => {
    const result = await saveCommandRules(orgId, repository, rules);
    if (!result.ok) {
      report(result.error);
      return;
    }
    notify(t("site.perm.saved"));
    router.refresh();
  });

  return (
    <fieldset disabled={!manages || busy} className="grid gap-5">
      <SettingsSection title={t("site.perm.catalog")} description={t("site.perm.catalog.hint")}>
        <div className="grid gap-3 @xl:grid-cols-2">
          {COMMAND_CATALOG.map(({ tool, subcommands }) => {
            const toolLocked = inherited.includes(tool);
            const toolOn = toolLocked || picked.includes(tool);
            return (
              <div key={tool} className="grid content-start gap-2 rounded-md border border-border/60 p-3">
                <label htmlFor={`perm-${tool}`} className="flex items-center gap-2.5 text-sm font-medium">
                  <Checkbox id={`perm-${tool}`} checked={toolOn} disabled={toolLocked || !manages} onCheckedChange={(on) => toggle(tool, on === true)} />
                  <code className="font-mono">{tool}</code>
                  <span className="text-xs font-normal text-muted-foreground">{toolLocked ? t("site.perm.inherited") : subcommands.length > 0 ? t("site.perm.all") : ""}</span>
                </label>
                {subcommands.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {subcommands.map((sub) => {
                      const rule = `${tool} ${sub}`;
                      const locked = covered(rule, inherited);
                      const on = locked || toolOn || picked.includes(rule);
                      return (
                        <label
                          key={rule}
                          htmlFor={`perm-${tool}-${sub}`}
                          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${on ? "border-destructive/60 bg-destructive/10" : "border-border/70"}`}
                        >
                          <Checkbox id={`perm-${tool}-${sub}`} checked={on} disabled={locked || toolOn || !manages} onCheckedChange={(next) => toggle(rule, next === true)} />
                          <code className="font-mono">{sub}</code>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title={t("site.perm.other")}>
        <FormField label={t("site.perm.other.label")} htmlFor="perm-other" hint={t("site.perm.other.hint")} error={invalid ? t("site.perm.invalid") : null}>
          <Textarea id="perm-other" rows={4} spellCheck={false} className="font-mono text-xs" placeholder="terraform destroy" value={other}
            aria-invalid={invalid || undefined} onChange={(event) => setOther(event.target.value)} />
        </FormField>
      </SettingsSection>

      {manages && (
        <div className="flex flex-wrap items-center gap-3">
          <Button loading={busy} disabled={busy || invalid} onClick={save}>{t("site.perm.save")}</Button>
          <span className="text-xs text-muted-foreground">{t("site.perm.count", { count: rules.length })}</span>
        </div>
      )}
    </fieldset>
  );
}
