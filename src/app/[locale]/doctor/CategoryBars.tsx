/** Barras horizontais com o rótulo e o número em texto ao lado: a barra só reforça a ordem. */
export function CategoryBars({ title, empty, items }: {
  title: string; empty: string; items: { label: string; count: number; shown: string }[];
}) {
  const top = Math.max(1, ...items.map(({ count }) => count));
  return (
    <section aria-label={title} className="grid min-w-0 content-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <h2 className="text-sm font-medium">{title}</h2>
      {items.length === 0 && <p className="text-xs text-muted-foreground">{empty}</p>}
      <ul className="grid gap-2">
        {items.map((item) => (
          <li key={item.label} className="grid grid-cols-[minmax(0,10rem)_minmax(2rem,1fr)_auto] items-center gap-3 text-xs">
            <span className="truncate">{item.label}</span>
            <span aria-hidden="true" className="h-2 overflow-hidden rounded-xs bg-secondary">
              <span className="block h-full rounded-xs bg-chart-1" style={{ width: `${(item.count / top) * 100}%` }} />
            </span>
            <span className="tabular-nums">{item.shown}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
