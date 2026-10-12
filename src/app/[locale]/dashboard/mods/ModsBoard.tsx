"use client";

import { useState, useTransition, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DownloadIcon, ExternalLinkIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { EmptyText } from "@/components/atoms";
import { ConfirmAction, FormField, OptionSelect, SegmentedControl, SettingsSection, ToggleRow } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFeedback } from "@/modules/feedback";
import { useLocale, useT, type Key } from "@/modules/i18n";
import {
  draftOf, draftProblems, EMPTY_DRAFT, KNOWN_POINTS, MAX_MODS, modText, NAME_MAX, pointsOf, reservedAgentIds, type Catalog, type ModDraft, type ModManifest,
} from "@/modules/mods/rules";
import { activeMods, type InstalledMods, type ModChange } from "@/modules/mods/state";
import type { StoredMod } from "./data";
import { changeMod, deleteMod, saveMod } from "./actions";

/** O formulário aberto: um mod novo (`id` nulo) ou um que já existe. */
type Editing = { id: string | null; draft: ModDraft };

/** O nome de um ponto de extensão; o que o site não conhece é "outro". */
const pointLabel = (point: string): Key => ((KNOWN_POINTS as readonly string[]).includes(point) ? `mods.point.${point}` : "mods.point.other") as Key;

/** Os mods do ambiente escolhido: os do catálogo — instalar, ligar, desligar e
 * desinstalar, como a aba Mods do app — e os que a pessoa cria. Cada gravação
 * vai direto para a configuração sincronizada: o app recebe na próxima volta do
 * sync. A chave de API e os modelos ficam no app, na aba do mod. */
export function ModsBoard({ environment, environments, catalog, state, mods, canCreate, startCreating }: {
  environment: string;
  environments: { id: string; name: string }[];
  catalog: Catalog | null;
  /** O estado dos mods do catálogo no ambiente; nulo, o banco não respondeu. */
  state: InstalledMods | null;
  mods: StoredMod[] | null;
  canCreate: boolean;
  startCreating: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { notify, report } = useFeedback();
  const [editing, setEditing] = useState<Editing | null>(startCreating && canCreate ? { id: null, draft: EMPTY_DRAFT } : null);
  const [touched, setTouched] = useState(false);
  const [busy, startBusy] = useTransition();
  // Os agentes dos mods do catálogo são do app: aqui ficam só os que a pessoa
  // criou.
  const reserved = new Set(reservedAgentIds(catalog));
  const list = (mods ?? []).filter((mod) => !reserved.has(mod.id));
  const full = (mods ?? []).length >= MAX_MODS;
  const active = state ? activeMods(state, catalog) : new Set<string>();
  const nameOf = (mod: StoredMod) => (typeof mod.options.name === "string" && mod.options.name.trim()) || mod.id.slice(4);

  const run = <T,>(action: () => Promise<{ ok: true; data: T } | { ok: false; error: unknown }>, done: (data: T) => string, after?: () => void) => startBusy(async () => {
    const result = await action();
    if (!result.ok) { report(result.error); return; }
    notify(done(result.data));
    after?.();
    router.refresh();
  });

  const switchEnvironment = (next: string) => {
    setEditing(null);
    router.push(`${pathname}?${new URLSearchParams({ environment: next }).toString()}`);
  };

  const problems = editing ? draftProblems(editing.draft) : {};
  const shown = (field: keyof ModDraft) => (touched && problems[field] ? t(problems[field] as Key) : null);
  const set = (patch: Partial<ModDraft>) => setEditing((current) => (current ? { ...current, draft: { ...current.draft, ...patch } } : current));
  const close = () => { setEditing(null); setTouched(false); };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!editing || Object.keys(problems).length > 0) return;
    const { id, draft } = editing;
    run(() => saveMod(environment, id, draft), () => t(id ? "site.mods.saved" : "site.mods.created", { name: draft.name.trim() }), close);
  };

  const change = (manifest: ModManifest, action: ModChange["action"]) => {
    const name = modText(manifest.title, locale);
    run(() => changeMod(environment, { id: manifest.id, action }), () => t(`site.mods.changed.${action}` as Key, { name }));
  };
  const installedMods = (catalog?.mods ?? []).filter((manifest) => state?.mods[manifest.id]);
  const available = (catalog?.mods ?? []).filter((manifest) => !state?.mods[manifest.id]);
  const titleOf = (id: string) => { const manifest = catalog?.mods.find((item) => item.id === id); return manifest ? modText(manifest.title, locale) : id; };

  const form = editing && (() => {
    const { draft } = editing;
    const cli = draft.kind === "cli";
    const creating = editing.id === null;
    return (
      <SettingsSection
        title={creating ? t("mods.create.title") : t("site.mods.form.edit", { name: draft.name || editing.id || "" })}
        description={t("site.mods.form.description")}
      >
        <form onSubmit={submit} className="grid gap-4 @xl:grid-cols-2" noValidate>
          <FormField label={t("mods.name")} htmlFor="mod-name" hint={t("mods.name.hint")} error={shown("name")}>
            <Input id="mod-name" maxLength={NAME_MAX} autoFocus={creating} value={draft.name} placeholder={t("mods.name.placeholder")} aria-invalid={shown("name") ? true : undefined} onChange={(event) => set({ name: event.target.value })} />
          </FormField>
          <FormField label={t("mods.kind")} hint={creating ? t(cli ? "mods.kind.cli.hint" : "mods.kind.api.hint") : t("site.mods.form.kindFixed")}>
            {creating
              ? <SegmentedControl label={t("mods.kind")} value={draft.kind} onChange={(kind) => set({ kind })} options={[{ value: "cli", label: t("mods.kind.cli") }, { value: "api", label: t("mods.kind.api") }]} />
              : <Badge variant="outline" className="w-fit">{t(cli ? "mods.kind.cli" : "mods.kind.api")}</Badge>}
          </FormField>
          {cli ? (
            <>
              <FormField label={t("mods.command")} htmlFor="mod-command" hint={t("mods.command.hint")} error={shown("command")}>
                <Input id="mod-command" spellCheck={false} className="font-mono" value={draft.command} aria-invalid={shown("command") ? true : undefined} onChange={(event) => set({ command: event.target.value })} />
              </FormField>
              <FormField label={t("mods.args")} htmlFor="mod-args" hint={t("mods.args.hint")} error={shown("args")} wide>
                <Input id="mod-args" spellCheck={false} className="font-mono text-xs" value={draft.args} placeholder="run --model {model} {prompt}" aria-invalid={shown("args") ? true : undefined} onChange={(event) => set({ args: event.target.value })} />
              </FormField>
              <ToggleRow id="mod-edits" label={t("mods.edits")} hint={t("mods.edits.hint")} checked={draft.edits} onChange={(edits) => set({ edits })} className="col-span-full" />
              <FormField label={t("mods.planArgs")} htmlFor="mod-plan-args" hint={t(draft.edits ? "mods.planArgs.hint.required" : "mods.planArgs.hint")} error={shown("planArgs")} wide>
                <Input id="mod-plan-args" spellCheck={false} className="font-mono text-xs" value={draft.planArgs} placeholder="run --read-only --model {model} {prompt}" aria-invalid={shown("planArgs") ? true : undefined} onChange={(event) => set({ planArgs: event.target.value })} />
              </FormField>
            </>
          ) : (
            <>
              <FormField label={t("mods.protocol")} hint={t("mods.protocol.hint")}>
                <SegmentedControl label={t("mods.protocol")} value={draft.protocol} onChange={(protocol) => set({ protocol })}
                  options={[{ value: "openai", label: t("mods.protocol.openai") }, { value: "anthropic", label: t("mods.protocol.anthropic") }]} />
              </FormField>
              <FormField label={t("site.mods.baseUrl")} htmlFor="mod-url" hint={t("mods.baseUrl.hint")} error={shown("baseUrl")}>
                <Input id="mod-url" spellCheck={false} className="font-mono" value={draft.baseUrl} placeholder="http://localhost:8080/v1" aria-invalid={shown("baseUrl") ? true : undefined} onChange={(event) => set({ baseUrl: event.target.value })} />
              </FormField>
              <ToggleRow id="mod-key-required" label={t("mods.keyRequired")} hint={t("site.mods.form.keyHint")} checked={draft.keyRequired} onChange={(keyRequired) => set({ keyRequired })} className="col-span-full" />
            </>
          )}
          {creating && (
            <FormField label={t("mods.model")} htmlFor="mod-model" hint={t(cli ? "mods.model.hint.cli" : "mods.model.hint.api")} error={shown("model")}>
              <Input id="mod-model" spellCheck={false} className="font-mono" value={draft.model} aria-invalid={shown("model") ? true : undefined} onChange={(event) => set({ model: event.target.value })} />
            </FormField>
          )}
          <div className="flex flex-wrap justify-end gap-2 @xl:col-span-2">
            <Button type="button" variant="ghost" onClick={close}>{t("common.cancel")}</Button>
            <Button type="submit" loading={busy}>{creating ? t("mods.create") : t("site.mods.form.save")}</Button>
          </div>
        </form>
      </SettingsSection>
    );
  })();

  const catalogRow = (manifest: ModManifest, action: React.ReactNode, lead?: React.ReactNode) => (
    <li key={manifest.id} className="flex flex-wrap items-start gap-3 rounded-md border border-border px-3 py-2.5">
      {lead}
      {/* O texto pede pelo menos 14rem: no celular, o botão desce para baixo dele. */}
      <div className="grid min-w-0 flex-1 basis-56 gap-0.5">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <span className="break-words">{modText(manifest.title, locale)}</span>
          {manifest.version && <Badge variant="outline" className="font-mono">{t("mods.version", { version: manifest.version })}</Badge>}
          {pointsOf(manifest).map((point) => <Badge key={point} variant="secondary">{t(pointLabel(point))}</Badge>)}
          {state?.mods[manifest.id]?.enabled && !active.has(manifest.id) && (manifest.requires ?? []).length > 0 && (
            <Badge variant="warning">{t("mods.requires.missing", { names: (manifest.requires ?? []).map(titleOf).join(", ") })}</Badge>
          )}
        </span>
        <span className="text-xs leading-snug text-muted-foreground">{modText(manifest.summary, locale)}</span>
        {(manifest.author || (manifest.requires ?? []).length > 0) && (
          <span className="text-xs text-muted-foreground">
            {[manifest.author ? t("mods.by", { author: manifest.author }) : null, (manifest.requires ?? []).length > 0 ? t("mods.requires", { names: (manifest.requires ?? []).map(titleOf).join(", ") }) : null].filter(Boolean).join(" · ")}
          </span>
        )}
        {manifest.homepage && (
          <a href={manifest.homepage} target="_blank" rel="noreferrer" className="flex w-fit items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {t("site.mods.homepage")}<ExternalLinkIcon aria-hidden="true" className="size-3" />
          </a>
        )}
      </div>
      {action}
    </li>
  );

  const installedRow = (manifest: ModManifest) => {
    const name = modText(manifest.title, locale);
    const on = state?.mods[manifest.id]?.enabled ?? false;
    const needing = installedMods.filter((other) => (other.requires ?? []).includes(manifest.id)).map((other) => modText(other.title, locale));
    return catalogRow(
      manifest,
      <ConfirmAction
        title={t("mods.uninstall.title", { name })}
        description={[t("site.mods.uninstall.description"), needing.length > 0 ? t("mods.uninstall.dependents", { names: needing.join(", ") }) : ""].filter(Boolean).join(" ")}
        confirm={t("mods.uninstall")}
        onConfirm={() => change(manifest, "uninstall")}
      >
        <Button variant="ghost" size="icon-sm" aria-label={t("mods.uninstall.named", { name })} title={t("mods.uninstall.named", { name })} disabled={busy}>
          <Trash2Icon aria-hidden="true" />
        </Button>
      </ConfirmAction>,
      <Switch checked={on} disabled={busy} aria-label={t("mods.enabled", { name })} className="mt-0.5" onCheckedChange={(next) => change(manifest, next ? "enable" : "disable")} />,
    );
  };

  const availableRow = (manifest: ModManifest) => catalogRow(
    manifest,
    <Button variant="outline" size="sm" disabled={busy || state === null} onClick={() => change(manifest, "install")}>
      <DownloadIcon aria-hidden="true" />{t("mods.install")}
    </Button>,
  );

  return (
    <div className="grid gap-6">
      <FormField label={t("site.mods.environment")} htmlFor="mod-environment" hint={t("site.mods.environment.hint")} className="max-w-sm">
        <OptionSelect id="mod-environment" value={environment} onChange={switchEnvironment} options={environments.map((item) => ({ value: item.id, label: item.name }))} />
      </FormField>

      <SettingsSection
        title={t("mods.yours")}
        description={t("site.mods.yours.description")}
        action={!editing && (
          <Button size="sm" disabled={!canCreate || full} title={!canCreate ? t("mods.empty.locked") : full ? t("mods.full", { max: MAX_MODS }) : undefined}
            onClick={() => { setTouched(false); setEditing({ id: null, draft: EMPTY_DRAFT }); }}>
            <PlusIcon aria-hidden="true" />{t("mods.create")}
          </Button>
        )}
      >
        {!canCreate && <p className="text-sm text-muted-foreground">{t("mods.empty.locked")}</p>}
        {mods === null
          ? <EmptyText>{t("site.mods.unavailable")}</EmptyText>
          : list.length === 0
            ? <EmptyText>{t("site.mods.yours.empty")}</EmptyText>
            : (
              <ul className="grid gap-2">
                {list.map((mod) => {
                  const name = nameOf(mod);
                  const api = mod.options.kind === "api";
                  return (
                    <li key={mod.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2.5">
                      <div className="grid min-w-0 flex-1 gap-0.5">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          <span className="break-words">{name}</span>
                          <Badge variant="outline">{t(api ? "mods.kind.api" : "mods.kind.cli")}</Badge>
                          {!mod.enabled && <Badge variant="secondary">{t("site.mods.off")}</Badge>}
                        </span>
                        <span className="truncate font-mono text-xs text-muted-foreground">{api ? String(mod.options.baseUrl ?? "") : mod.command}</span>
                        <span className="text-xs text-muted-foreground">{t("site.mods.models", { count: mod.models })}</span>
                      </div>
                      <Button variant="ghost" size="sm" disabled={!canCreate} onClick={() => { setTouched(false); setEditing({ id: mod.id, draft: draftOf(mod.options, mod.command) }); }}>
                        <PencilIcon aria-hidden="true" />{t("site.mods.edit")}
                      </Button>
                      <ConfirmAction title={t("mods.remove.title", { name })} description={t("site.mods.remove.description")} confirm={t("mods.remove")}
                        onConfirm={() => run(() => deleteMod(environment, mod.id), () => t("site.mods.removed", { name }), () => { if (editing?.id === mod.id) close(); })}>
                        <Button variant="ghost" size="icon-sm" aria-label={t("mods.remove.named", { name })} title={t("mods.remove.named", { name })} disabled={busy}>
                          <Trash2Icon aria-hidden="true" />
                        </Button>
                      </ConfirmAction>
                    </li>
                  );
                })}
              </ul>
            )}
      </SettingsSection>

      {form}

      <SettingsSection title={t("site.mods.catalog.title")} description={t("site.mods.catalog.description")}>
        {catalog === null ? <EmptyText>{t("site.mods.catalog.unavailable")}</EmptyText> : state === null ? <EmptyText>{t("site.mods.unavailable")}</EmptyText> : (
          <div className="grid gap-5">
            <section className="grid gap-2">
              <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t("mods.installedTitle")}</h4>
              {installedMods.length === 0
                ? <EmptyText>{t("mods.installedEmpty")}</EmptyText>
                : <ul className="grid gap-2 @3xl:grid-cols-2">{installedMods.map(installedRow)}</ul>}
            </section>
            <section className="grid gap-2">
              <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t("mods.available")}</h4>
              {available.length === 0
                ? <EmptyText>{t("mods.availableEmpty")}</EmptyText>
                : <ul className="grid gap-2 @3xl:grid-cols-2">{available.map(availableRow)}</ul>}
            </section>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
