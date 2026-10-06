"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { ConfirmAction, FormField, OptionSelect, SettingsSection } from "@/components/molecules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useFeedback } from "@/modules/feedback";
import { useT } from "@/modules/i18n";
import { blankServer, mcpProblems, MCP_AGENTS, parseMcpJson, parsePairs, pairsText, textLines, type McpTransport, type OrgMcpServer } from "@/modules/organizations/extensions";
import { canManage } from "@/modules/organizations/rules";
import { removeMcpServer, saveMcpServer, type ActionResult } from "../actions";
import type { OrganizationDetail } from "../data";

const AGENT_NAMES: Record<string, string> = { claude: "Claude Code", codex: "Codex", copilot: "GitHub Copilot" };

/** Os servidores MCP que a organização dá aos membros: eles descem para o
 * app de cada um, somados aos que a pessoa já tem, e lá não se editam. Só
 * owner e maintainer veem e mexem (os servidores podem levar tokens). */
export function McpSection({ detail }: { detail: OrganizationDetail }) {
  const t = useT();
  const router = useRouter();
  const { notify, report } = useFeedback();
  const orgId = detail.organization.id;
  const manages = canManage(detail.organization.role);
  const [editing, setEditing] = useState<{ server: OrgMcpServer; isNew: boolean } | null>(null);
  const [pasted, setPasted] = useState("");
  const [busy, startBusy] = useTransition();

  const run = (action: () => Promise<ActionResult<null>>, done: string, after?: () => void) => startBusy(async () => {
    const result = await action();
    if (!result.ok) { report(result.error); return; }
    notify(done);
    after?.();
    router.refresh();
  });

  const importPasted = () => {
    const servers = parseMcpJson(pasted);
    if (servers.length === 0) { notify(t("site.org.mcp.import.invalid"), true); return; }
    const taken = new Set(detail.mcpServers.map((server) => server.name));
    // Um de cada vez para o formulário conferir; vários ficam para a próxima.
    const [first, ...rest] = servers;
    setEditing({ server: first, isNew: !taken.has(first.name) });
    setPasted(rest.length > 0 ? JSON.stringify({ mcpServers: Object.fromEntries(rest.map((server) => [server.name, server.transport === "http" ? { url: server.url, headers: server.headers } : { command: server.command, args: server.args, env: server.env }])) }, null, 2) : "");
  };

  if (!manages) {
    return <SettingsSection title={t("site.org.mcp.title")} description={t("site.org.mcp.description")}><p className="text-sm text-muted-foreground">{t("site.org.mcp.readOnly")}</p></SettingsSection>;
  }

  return (
    <div className="grid gap-5">
      <SettingsSection title={t("site.org.mcp.title")} description={t("site.org.mcp.description")}
        action={<Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setEditing({ server: blankServer(), isNew: true })}><PlusIcon aria-hidden="true" />{t("site.org.mcp.add")}</Button>}>
        {detail.mcpServers.length === 0 ? <p className="text-sm text-muted-foreground">{t("site.org.mcp.empty")}</p> : (
          <ul className="grid gap-2">
            {detail.mcpServers.map((server) => (
              <li key={server.name} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2">
                <Switch checked={server.enabled} disabled={busy} aria-label={t("site.org.mcp.enabled", { name: server.name })}
                  onCheckedChange={(enabled) => run(() => saveMcpServer(orgId, { ...server, enabled }), t("site.org.mcp.saved"))} />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <span className="flex items-center gap-2 text-sm font-medium">{server.name}<Badge variant="outline">{server.transport}</Badge></span>
                  <code className="truncate font-mono text-xs text-muted-foreground">{server.transport === "stdio" ? [server.command, ...server.args].join(" ") : server.url}</code>
                  <span className="text-xs text-muted-foreground">{server.agents.length === 0 ? t("site.org.mcp.agents.all") : server.agents.map((agent) => AGENT_NAMES[agent] ?? agent).join(", ")}</span>
                </div>
                <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label={t("site.org.mcp.edit", { name: server.name })} title={t("site.org.mcp.edit", { name: server.name })}
                  onClick={() => setEditing({ server, isNew: false })}><PencilIcon aria-hidden="true" /></Button>
                <ConfirmAction title={t("site.org.mcp.delete.title", { name: server.name })} description={t("site.org.mcp.delete.description")}
                  onConfirm={() => run(() => removeMcpServer(orgId, server.name), t("site.org.mcp.deleted"))}>
                  <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label={t("site.org.mcp.delete", { name: server.name })} title={t("site.org.mcp.delete", { name: server.name })}><Trash2Icon aria-hidden="true" /></Button>
                </ConfirmAction>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs leading-snug text-muted-foreground">{t("site.org.mcp.secrets")}</p>
      </SettingsSection>

      {editing && (
        <ServerForm key={`${editing.server.name}:${editing.isNew}`} initial={editing.server} isNew={editing.isNew} existing={detail.mcpServers} busy={busy}
          onCancel={() => setEditing(null)}
          onSave={(server) => run(() => saveMcpServer(orgId, server), t("site.org.mcp.saved"), () => setEditing(null))} />
      )}

      <SettingsSection title={t("site.org.mcp.import.title")} description={t("site.org.mcp.import.description")}>
        <Textarea rows={5} value={pasted} spellCheck={false} placeholder={t("site.org.mcp.import.placeholder")} className="font-mono text-xs" onChange={(event) => setPasted(event.target.value)} />
        <div className="flex justify-end"><Button type="button" disabled={busy || !pasted.trim()} onClick={importPasted}>{t("site.org.mcp.import.read")}</Button></div>
      </SettingsSection>
    </div>
  );
}

function ServerForm({ initial, isNew, existing, busy, onCancel, onSave }: {
  initial: OrgMcpServer; isNew: boolean; existing: OrgMcpServer[]; busy: boolean; onCancel: () => void; onSave: (server: OrgMcpServer) => void;
}) {
  const t = useT();
  const [server, setServer] = useState(initial);
  // Os campos de texto guardam o que foi digitado; a lista e os pares saem deles.
  const [args, setArgs] = useState(initial.args.join("\n"));
  const [env, setEnv] = useState(pairsText(initial.env, "="));
  const [headers, setHeaders] = useState(pairsText(initial.headers, ":"));
  const draft: OrgMcpServer = { ...server, args: textLines(args), env: parsePairs(env, "="), headers: parsePairs(headers, ":") };
  const problems = mcpProblems(draft);
  const replaces = isNew && existing.some((known) => known.name === draft.name);
  const update = (changes: Partial<OrgMcpServer>) => setServer((current) => ({ ...current, ...changes }));
  const toggleAgent = (agent: string, on: boolean) => update({ agents: on ? [...server.agents, agent] : server.agents.filter((item) => item !== agent) });

  return (
    <SettingsSection title={t(isNew ? "site.org.mcp.form.new" : "site.org.mcp.form.edit", { name: initial.name })}>
      <fieldset disabled={busy} className="grid gap-4 @xl:grid-cols-2">
        <FormField label={t("site.org.mcp.field.name")} htmlFor="mcp-name" hint={t("site.org.mcp.field.name.hint")} error={problems.includes("name") && draft.name ? t("site.org.mcp.invalid.name") : replaces ? t("site.org.mcp.replaces") : null}>
          <Input id="mcp-name" value={server.name} disabled={!isNew} spellCheck={false} className="font-mono" onChange={(event) => update({ name: event.target.value.trim() })} />
        </FormField>
        <FormField label={t("site.org.mcp.field.transport")} htmlFor="mcp-transport">
          <OptionSelect id="mcp-transport" value={server.transport} onChange={(value) => update({ transport: value as McpTransport })}
            options={[{ value: "stdio", label: t("site.org.mcp.transport.stdio") }, { value: "http", label: t("site.org.mcp.transport.http") }]} />
        </FormField>
        {server.transport === "stdio" ? (
          <>
            <FormField label={t("site.org.mcp.field.command")} htmlFor="mcp-command" error={problems.includes("command") && server.command ? t("site.org.mcp.invalid.command") : null}>
              <Input id="mcp-command" value={server.command} spellCheck={false} className="font-mono" placeholder="npx" onChange={(event) => update({ command: event.target.value })} />
            </FormField>
            <FormField label={t("site.org.mcp.field.args")} htmlFor="mcp-args" hint={t("site.org.mcp.field.args.hint")}>
              <Textarea id="mcp-args" rows={3} value={args} spellCheck={false} className="font-mono text-xs" onChange={(event) => setArgs(event.target.value)} />
            </FormField>
            <FormField label={t("site.org.mcp.field.env")} htmlFor="mcp-env" wide hint={t("site.org.mcp.field.env.hint")} error={problems.includes("env") ? t("site.org.mcp.invalid.env") : null}>
              <Textarea id="mcp-env" rows={3} value={env} spellCheck={false} className="font-mono text-xs" placeholder="API_TOKEN=..." onChange={(event) => setEnv(event.target.value)} />
            </FormField>
          </>
        ) : (
          <>
            <FormField label={t("site.org.mcp.field.url")} htmlFor="mcp-url" wide error={problems.includes("url") && server.url ? t("site.org.mcp.invalid.url") : null}>
              <Input id="mcp-url" value={server.url} spellCheck={false} className="font-mono" placeholder="https://" onChange={(event) => update({ url: event.target.value })} />
            </FormField>
            <FormField label={t("site.org.mcp.field.headers")} htmlFor="mcp-headers" wide hint={t("site.org.mcp.field.headers.hint")}>
              <Textarea id="mcp-headers" rows={3} value={headers} spellCheck={false} className="font-mono text-xs" placeholder="Authorization: Bearer ..." onChange={(event) => setHeaders(event.target.value)} />
            </FormField>
          </>
        )}
        <FormField label={t("site.org.mcp.field.agents")} wide hint={t("site.org.mcp.field.agents.hint")}>
          <div className="flex flex-wrap gap-2">
            {MCP_AGENTS.map((agent) => (
              <label key={agent} htmlFor={`mcp-agent-${agent}`} className="flex items-center gap-2.5 rounded-md border border-border/60 px-3 py-2 text-sm">
                <Checkbox id={`mcp-agent-${agent}`} checked={server.agents.includes(agent)} onCheckedChange={(on) => toggleAgent(agent, on === true)} />
                {AGENT_NAMES[agent]}
              </label>
            ))}
          </div>
        </FormField>
        <div className="col-span-full flex flex-wrap gap-2">
          <Button type="button" disabled={busy || problems.length > 0} onClick={() => onSave(draft)}>{t("site.org.mcp.save")}</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>{t("common.cancel")}</Button>
        </div>
      </fieldset>
    </SettingsSection>
  );
}
