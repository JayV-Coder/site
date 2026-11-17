"use client";

import { useEffect, useState, useTransition } from "react";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadName, shareToken } from "@/modules/doctor/shared";
import { useT } from "@/modules/i18n";

/** O token fica no `#` do link, que o navegador não manda ao servidor: a tela o lê aqui e o envia
 * no corpo do pedido. O arquivo chega como blob e é salvo com o nome que a API deu. */
export function SharedDownload() {
  const t = useT();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [failure, setFailure] = useState<"invalid" | "failed" | null>(null);
  const [done, setDone] = useState(false);
  const [busy, startBusy] = useTransition();
  // Outro link colado na mesma aba só troca o `#`: a página não recarrega, então relê aqui.
  useEffect(() => {
    const read = () => { setToken(shareToken(window.location.hash)); setFailure(null); setDone(false); };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  if (token === undefined) return null;
  if (token === null) return <p role="alert" className="text-sm text-destructive">{t("site.doctor.shared.invalid")}</p>;

  const download = () => startBusy(async () => {
    setFailure(null);
    setDone(false);
    const response = await fetch(window.location.pathname.replace(/\/?$/, "/file"), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }),
    }).catch(() => null);
    if (!response?.ok) { setFailure(response?.status === 404 ? "invalid" : "failed"); return; }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = downloadName(response.headers.get("content-disposition"));
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
      {failure && <p role="alert" className="text-sm text-destructive">{t(failure === "invalid" ? "site.doctor.shared.invalid" : "site.doctor.shared.failed")}</p>}
      {done && <p role="status" className="text-sm text-success">{t("site.doctor.shared.done")}</p>}
    </div>
  );
}
