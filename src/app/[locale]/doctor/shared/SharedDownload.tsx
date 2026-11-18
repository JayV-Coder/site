"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dispositionFilename, shareToken } from "@/modules/doctor/shared";
import { useT } from "@/modules/i18n";

type Failure = "invalid" | "failed" | "tooMany";
const MESSAGES = { invalid: "site.doctor.shared.invalid", failed: "site.doctor.shared.failed", tooMany: "site.doctor.shared.tooMany" } as const;

/** O token chega no `#` do link, que o navegador não manda ao servidor: a tela o lê, tira do
 * endereço (não fica no histórico de um computador compartilhado) e o envia no corpo do pedido.
 * O arquivo chega como blob e é salvo com o nome que a API deu. */
export function SharedDownload() {
  const t = useT();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [done, setDone] = useState(false);
  const [busy, startBusy] = useTransition();
  // Só o pedido do link atual vale: outro link colado no meio do download não herda o resultado.
  const round = useRef(0);

  useEffect(() => {
    const read = () => {
      if (!window.location.hash) return;
      round.current += 1;
      setToken(shareToken(window.location.hash));
      setFailure(null);
      setDone(false);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    };
    read();
    setToken((current) => (current === undefined ? null : current));
    // Outro link colado na mesma aba só troca o `#`: a página não recarrega, então relê aqui.
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  if (token === undefined) return null;
  if (token === null) return <p role="alert" className="text-sm text-destructive">{t("site.doctor.shared.invalid")}</p>;

  const download = () => startBusy(async () => {
    const mine = ++round.current;
    setFailure(null);
    setDone(false);
    const response = await fetch(`${window.location.pathname.replace(/\/$/, "")}/file`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }),
    }).catch(() => null);
    const blob = response?.ok ? await response.blob().catch(() => null) : null;
    if (mine !== round.current) return;
    if (!response?.ok || !blob) {
      setFailure(response?.status === 404 ? "invalid" : response?.status === 429 ? "tooMany" : "failed");
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = dispositionFilename(response.headers.get("content-disposition"), response.headers.get("content-type"));
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    // Safari no iOS e o Firefox ainda leem o blob depois do clique: libera só depois.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setDone(true);
  });

  return (
    <div className="grid justify-items-start gap-3">
      <Button onClick={download} loading={busy}><DownloadIcon />{t("site.doctor.shared.download")}</Button>
      {failure && <p role="alert" className="text-sm text-destructive">{t(MESSAGES[failure])}</p>}
      {done && <p role="status" className="text-sm text-success">{t("site.doctor.shared.done")}</p>}
    </div>
  );
}
