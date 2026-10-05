import type { Key } from "@/modules/i18n";

type T = (key: Key, params?: Record<string, string | number>) => string;

/** Um bloco de terminal como os do chat do app: a barra com o nome, o
 * pedido depois do `❯` e o caminho que o Jev seguiu. Só desenho: nada roda. */
export function Trace({ t }: { t: T }) {
  const rows: [string, string][] = [
    [t("site.trace.agent"), "cursor"],
    [t("site.trace.model"), "auto"],
    [t("site.trace.mode"), t("site.trace.modeValue")],
    [t("site.trace.role"), t("site.trace.roleValue")],
  ];
  return (
    <figure aria-label={t("site.trace.label")} className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex h-9 items-center justify-between border-b border-border bg-secondary px-3 text-caption tracking-wider text-muted-foreground uppercase">
        <span>route.trace</span>
        <span aria-hidden="true" className="flex gap-1.5"><i className="size-2 rounded-full bg-stop/70" /><i className="size-2 rounded-full bg-ask/70" /><i className="size-2 rounded-full bg-go/70" /></span>
      </div>
      <div className="grid gap-1 p-4 text-small sm:p-5 sm:text-body">
        <p className="flex gap-[1ch] break-words"><span aria-hidden="true" className="text-go">❯</span><span>jayv run <span className="text-muted-foreground">&quot;{t("site.trace.request")}&quot;</span></span></p>
        <p className="text-muted-foreground">{t("site.trace.indexing")}</p>
        <p><span className="text-go">✓</span> {t("site.trace.entry")}</p>
        <p><span className="text-go">✓</span> {t("site.trace.scope")}</p>
        <dl className="my-2 grid grid-cols-[max-content_1fr] gap-x-4 border-l-2 border-accent bg-secondary/60 px-3 py-2">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p><span className="text-go">✓</span> {t("site.trace.exit")}</p>
        {/* Passar pelas regras não é estar verificado: a linha não ganha o ✓
            verde, como no app. */}
        <p className="text-muted-foreground"><span aria-hidden="true">○</span> {t("site.trace.unverified")}</p>
        <p className="text-muted-foreground">{t("site.trace.saved")}<span aria-hidden="true" className="ml-1 inline-block h-[1.1em] w-[0.6ch] translate-y-[0.2em] animate-caret bg-foreground" /></p>
      </div>
    </figure>
  );
}
