"use client";

import { useRef, useState } from "react";
import { FormField, OptionSelect } from "@/components/molecules";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  buildSalesforceCredential, credentialFields, pairCredential, serviceAccountEmail, type SalesforceAuth, type SalesforceFields,
} from "@/modules/doctor/connectors";
import type { Key } from "@/modules/i18n";
import { useT } from "@/modules/i18n";

/** A credencial fica só na memória do componente até ser enviada: nunca em sessionStorage,
 * cookie ou endereço. O Google Cloud recebe a chave JSON da Service Account; o Salesforce, os
 * campos da Connected App; os outros provedores, um texto. */
export function CredentialField({ provider, auth, onChange }: { provider: string; auth?: unknown; onChange: (credential: string | null) => void }) {
  const t = useT();
  const [account, setAccount] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  // Só vale a leitura do último arquivo escolhido: uma anterior, mais lenta, não o sobrescreve.
  const latest = useRef(0);

  if (provider === "salesforce") return <SalesforceCredential onChange={onChange} />;
  const pair = credentialFields(provider, auth);
  if (pair) return <PairCredential names={pair} onChange={onChange} />;
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
        const round = ++latest.current;
        onChange(null);
        void (file?.text() ?? Promise.resolve("")).then((text) => {
          if (round !== latest.current) return;
          const email = serviceAccountEmail(text);
          setAccount(email);
          setInvalid(text !== "" && email === null);
          onChange(email ? text : null);
        });
      }} />
    </FormField>
  );
}

const PAIR_LABELS: Record<string, Key> = {
  client_id: "site.doctor.credential.clientId",
  client_secret: "site.doctor.credential.clientSecret",
  username: "site.doctor.credential.username",
  password: "site.doctor.credential.password",
};

/** SAP Integration Suite e OData: dois campos que viram o JSON que o Conector lê. */
function PairCredential({ names, onChange }: { names: string[]; onChange: (credential: string | null) => void }) {
  const t = useT();
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <div className="grid gap-3">
      {names.map((name) => (
        <FormField key={name} label={t(PAIR_LABELS[name] ?? "site.doctor.credential.secret")} htmlFor={`doctor-credential-${name}`}>
          <Input id={`doctor-credential-${name}`} type={name.endsWith("secret") || name === "password" ? "password" : "text"} autoComplete="off" autoCapitalize="none" spellCheck={false}
            value={values[name] ?? ""} onChange={(event) => {
              const next = { ...values, [name]: event.currentTarget.value };
              setValues(next);
              onChange(pairCredential(names, next));
            }} />
        </FormField>
      ))}
    </div>
  );
}

const EMPTY: SalesforceFields = { client_id: "", username: "", private_key: "", client_secret: "", refresh_token: "" };

function SalesforceCredential({ onChange }: { onChange: (credential: string | null) => void }) {
  const t = useT();
  const [auth, setAuth] = useState<SalesforceAuth>("jwt_bearer");
  return (
    <div className="grid gap-3">
      <FormField label={t("site.doctor.credential.sfAuth")} htmlFor="doctor-sf-auth">
        <OptionSelect id="doctor-sf-auth" value={auth} onChange={(mode) => { setAuth(mode); onChange(null); }}
          options={[{ value: "jwt_bearer", label: t("site.doctor.credential.sfJwt") }, { value: "web_server", label: t("site.doctor.credential.sfWeb") }]} />
      </FormField>
      <SalesforceSecret key={auth} auth={auth} onChange={onChange} />
    </div>
  );
}

/** Os campos da Connected App para um modo de autenticação já escolhido (o assistente escolhe o
 * modo junto com a config). Trocar de modo recomeça os campos. */
export function SalesforceSecret({ auth, onChange }: { auth: SalesforceAuth; onChange: (credential: string | null) => void }) {
  const t = useT();
  const [fields, setFields] = useState(EMPTY);
  const change = (next: Partial<SalesforceFields>) => {
    const merged = { ...fields, ...next };
    setFields(merged);
    onChange(buildSalesforceCredential(auth, merged));
  };
  const input = (name: keyof SalesforceFields, label: string, secret = false) => (
    <FormField label={label} htmlFor={`doctor-sf-${name}`}>
      <Input id={`doctor-sf-${name}`} type={secret ? "password" : name === "username" ? "email" : "text"} autoComplete="off" autoCapitalize="none" spellCheck={false}
        value={fields[name]} onChange={(event) => change({ [name]: event.currentTarget.value })} />
    </FormField>
  );
  return (
    <div className="grid gap-3">
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
