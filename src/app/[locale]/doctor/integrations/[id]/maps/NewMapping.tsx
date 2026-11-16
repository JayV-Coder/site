"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { FormField, OptionSelect, ToggleRow } from "@/components/molecules";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  defaultRows, keysFromRows, MAPPING_SYSTEMS, mappingSystemName, type KeyRow, type LookupDraft,
} from "@/modules/doctor/integrations";
import { nameOf } from "@/modules/doctor/labels";
import { useKeyedAction } from "@/modules/doctor/useKeyedAction";
import { useSay, useT } from "@/modules/i18n";
import { createMapping } from "../../actions";

const NO_LOOKUP: LookupDraft = { connector: "", entity: "", field: "", statusField: "", idField: "", pad: "0" };
const NONE = "none";

/** O Mapa novo: uma linha por sistema (origem, middleware, destino), a janela, o aviso de
 * divergência (INT-008) e, opcional, a consulta de leitura no destino. */
export function NewMapping({ integration, source, target, connectors }: {
  integration: string; source: string; target: string; connectors: { id: string; name: string }[] | null;
}) {
  const t = useT();
  const say = useSay();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rows, setRows] = useState<KeyRow[]>(() => defaultRows(source, target));
  const [window, setWindow] = useState("60");
  const [reconcile, setReconcile] = useState(false);
  const [lookup, setLookup] = useState(NO_LOOKUP);
  const action = useKeyedAction();
  const reset = () => { setName(""); setRows(defaultRows(source, target)); setWindow("60"); setReconcile(false); setLookup(NO_LOOKUP); action.reset(); };
  // Mudar qualquer campo é outro pedido: chave nova e o erro anterior some.
  const touched = () => { if (action.error) action.reset(); };
  const row = (index: number, change: Partial<KeyRow>) => { setRows((current) => current.map((item, at) => (at === index ? { ...item, ...change } : item))); if (action.error) action.reset(); };
  const look = (change: Partial<LookupDraft>) => { setLookup((current) => ({ ...current, ...change })); if (action.error) action.reset(); };
  const systems = MAPPING_SYSTEMS.map((value) => ({ value, label: nameOf(t, mappingSystemName(value)) }));

  return (
    <Dialog open={open} onOpenChange={(next) => { if (action.busy) return; setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild><Button size="sm"><PlusIcon />{t("site.doctor.maps.new")}</Button></DialogTrigger>
      <DialogContent closeLabel={t("common.close")} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("site.doctor.maps.new")}</DialogTitle>
          <DialogDescription>{t("site.doctor.maps.newHint")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          action.run((key) => createMapping(integration, { name, keys: keysFromRows(rows), window: Number(window), reconcile, lookup }, key), () => { setOpen(false); reset(); });
        }}>
          <FormField label={t("site.doctor.maps.name")} htmlFor="doctor-map-name">
            <Input id="doctor-map-name" required minLength={2} maxLength={80} placeholder={t("site.doctor.maps.namePlaceholder")} value={name} onChange={(event) => { setName(event.currentTarget.value); touched(); }} />
          </FormField>
          {rows.map((item, index) => (
            <fieldset key={index} className="grid gap-3 rounded-lg border border-border/60 px-3.5 py-3">
              <legend className="px-1 text-xs text-muted-foreground">{t("site.doctor.maps.key", { number: index + 1 })}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label={t("site.doctor.maps.system")} htmlFor={`doctor-map-system-${index}`}>
                  <OptionSelect id={`doctor-map-system-${index}`} value={item.system} onChange={(value) => row(index, { system: value })} options={systems} />
                </FormField>
                <FormField label={t("site.doctor.maps.field")} htmlFor={`doctor-map-field-${index}`}>
                  <Input id={`doctor-map-field-${index}`} className="font-mono" placeholder="attributes.bstkd" autoCapitalize="none" spellCheck={false}
                    value={item.field} onChange={(event) => row(index, { field: event.currentTarget.value })} />
                </FormField>
              </div>
              <FormField label={t("site.doctor.maps.prefix")} htmlFor={`doctor-map-prefix-${index}`}>
                <Input id={`doctor-map-prefix-${index}`} className="font-mono" maxLength={32} placeholder="SF-" value={item.prefix} onChange={(event) => row(index, { prefix: event.currentTarget.value })} />
              </FormField>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <label className="flex items-center gap-2"><Checkbox checked={item.zeros} onCheckedChange={(checked) => row(index, { zeros: checked === true })} />{t("site.doctor.maps.zeros")}</label>
                <label className="flex items-center gap-2"><Checkbox checked={item.upper} onCheckedChange={(checked) => row(index, { upper: checked === true })} />{t("site.doctor.maps.upper")}</label>
              </div>
            </fieldset>
          ))}
          <FormField label={t("site.doctor.maps.windowMinutes")} htmlFor="doctor-map-window">
            <Input id="doctor-map-window" type="number" required min={1} max={1440} value={window} onChange={(event) => { setWindow(event.currentTarget.value); touched(); }} />
          </FormField>
          <ToggleRow id="doctor-map-reconcile" label={t("site.doctor.maps.reconcileLabel")} checked={reconcile} onChange={(value) => { setReconcile(value); touched(); }} />
          <fieldset className="grid gap-3 rounded-lg border border-border/60 px-3.5 py-3">
            <legend className="px-1 text-xs text-muted-foreground">{t("site.doctor.maps.lookupTitle")}</legend>
            <FormField label={t("site.doctor.maps.connector")} htmlFor="doctor-map-connector" hint={connectors === null ? t("site.doctor.maps.connectorsUnavailable") : connectors.length === 0 ? t("site.doctor.maps.noConnector") : undefined}>
              <OptionSelect id="doctor-map-connector" value={lookup.connector || NONE} disabled={!connectors?.length}
                onChange={(value) => look({ connector: value === NONE ? "" : value })}
                options={[{ value: NONE, label: t("site.doctor.maps.noLookup") }, ...(connectors ?? []).map((item) => ({ value: item.id, label: item.name }))]} />
            </FormField>
            {lookup.connector && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label={t("site.doctor.maps.entity")} htmlFor="doctor-map-entity">
                    <Input id="doctor-map-entity" required className="font-mono" placeholder="A_SalesOrder" autoCapitalize="none" spellCheck={false} value={lookup.entity} onChange={(event) => look({ entity: event.currentTarget.value })} />
                  </FormField>
                  <FormField label={t("site.doctor.maps.lookupField")} htmlFor="doctor-map-lookup-field">
                    <Input id="doctor-map-lookup-field" required className="font-mono" placeholder="PurchaseOrderByCustomer" autoCapitalize="none" spellCheck={false} value={lookup.field} onChange={(event) => look({ field: event.currentTarget.value })} />
                  </FormField>
                  <FormField label={t("site.doctor.maps.statusField")} htmlFor="doctor-map-status-field">
                    <Input id="doctor-map-status-field" className="font-mono" autoCapitalize="none" spellCheck={false} value={lookup.statusField} onChange={(event) => look({ statusField: event.currentTarget.value })} />
                  </FormField>
                  <FormField label={t("site.doctor.maps.idField")} htmlFor="doctor-map-id-field">
                    <Input id="doctor-map-id-field" className="font-mono" placeholder="SalesOrder" autoCapitalize="none" spellCheck={false} value={lookup.idField} onChange={(event) => look({ idField: event.currentTarget.value })} />
                  </FormField>
                </div>
                <FormField label={t("site.doctor.maps.pad")} htmlFor="doctor-map-pad">
                  <Input id="doctor-map-pad" type="number" min={0} max={35} value={lookup.pad} onChange={(event) => look({ pad: event.currentTarget.value })} />
                </FormField>
              </>
            )}
          </fieldset>
          {action.error && <p role="alert" className="text-sm text-destructive">{say(action.error)}</p>}
          <DialogFooter><Button type="submit" loading={action.busy}>{t("site.doctor.maps.save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
