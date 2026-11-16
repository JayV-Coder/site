"use client";

import { useState } from "react";
import { FormField, OptionSelect } from "@/components/molecules";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildSalesforceCredential, serviceAccountEmail, type SalesforceAuth, type SalesforceFields } from "@/modules/doctor/connectors";
import { useT } from "@/modules/i18n";

/** A credencial fica só na memória do componente até ser enviada: nunca em sessionStorage,
 * cookie ou endereço. O Google Cloud recebe a chave JSON da Service Account; o Salesforce, os
 * campos da Connected App; os outros provedores, um texto. */
export function CredentialField({ provider, onChange }: { provider: string; onChange: (credential: string | null) => void }) {
  const t = useT();
  const [account, setAccount] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  if (provider === "salesforce") return <SalesforceCredential onChange={onChange} />;
  if (provider !== "gcp") {
    return (
      <FormField label={t("site.doctor.credential.secret")} htmlFor="doctor-credential-secret">
        <Input id="doctor-credential-secret" type="password" autoComplete="off" required onChange={(event) => onChange(event.currentTarget.value || null)} />
      </FormField>
    );
  }
  return (
    <FormField label={t("site.doctor.credential.gcpKey")} htmlFor="doctor-credential-file"
      error={invalid ? t("site.doctor.credential.gcpInvalid") : null}
      hint={account ? t("site.doctor.credential.gcpAccount", { account }) : undefined}>
      <Input id="doctor-credential-file" type="file" accept=".json,application/json" required onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        void (file?.text() ?? Promise.resolve("")).then((text) => {
          const email = serviceAccountEmail(text);
          setAccount(email);
          setInvalid(text !== "" && email === null);
          onChange(email ? text : null);
        });
      }} />
    </FormField>
  );
}

const EMPTY: SalesforceFields = { client_id: "", username: "", private_key: "", client_secret: "", refresh_token: "" };

function SalesforceCredential({ onChange }: { onChange: (credential: string | null) => void }) {
  const t = useT();
  const [auth, setAuth] = useState<SalesforceAuth>("jwt_bearer");
  const [fields, setFields] = useState(EMPTY);
  const change = (next: Partial<SalesforceFields>, mode = auth) => {
    const merged = { ...fields, ...next };
    setFields(merged);
    onChange(buildSalesforceCredential(mode, merged));
  };
  const input = (name: keyof SalesforceFields, label: string, secret = false) => (
    <FormField label={label} htmlFor={`doctor-sf-${name}`}>
      <Input id={`doctor-sf-${name}`} type={secret ? "password" : name === "username" ? "email" : "text"} autoComplete="off"
        value={fields[name]} onChange={(event) => change({ [name]: event.currentTarget.value })} />
    </FormField>
  );
  return (
    <div className="grid gap-3">
      <FormField label={t("site.doctor.credential.sfAuth")} htmlFor="doctor-sf-auth">
        <OptionSelect id="doctor-sf-auth" value={auth} onChange={(mode) => { setAuth(mode); change({}, mode); }}
          options={[{ value: "jwt_bearer", label: t("site.doctor.credential.sfJwt") }, { value: "web_server", label: t("site.doctor.credential.sfWeb") }]} />
      </FormField>
      {input("client_id", t("site.doctor.credential.sfClientId"))}
      {auth === "jwt_bearer" ? (
        <>
          {input("username", t("site.doctor.credential.sfUser"))}
          <FormField label={t("site.doctor.credential.sfKey")} htmlFor="doctor-sf-private_key">
            <Textarea id="doctor-sf-private_key" rows={4} spellCheck={false} className="font-mono text-xs" value={fields.private_key}
              onChange={(event) => change({ private_key: event.currentTarget.value })} />
          </FormField>
        </>
      ) : (
        <>
          {input("client_secret", t("site.doctor.credential.sfSecret"), true)}
          {input("refresh_token", t("site.doctor.credential.sfRefresh"), true)}
        </>
      )}
    </div>
  );
}
