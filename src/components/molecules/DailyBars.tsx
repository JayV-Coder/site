import { cn } from "@/lib/utils";

export interface DailyPoint {
  /** O dia como a tela escreve (`9 de out.`). */
  label: string;
  value: number;
  /** O valor como a tela escreve (`1,2 mil`, `US$ 0,40`). */
  shown: string;
}

/** Uma coluna por dia, crescendo da mesma linha de base: uma série só, então
 * sem legenda (o título diz o que é). Cada coluna mostra o dia e o valor ao
 * passar o mouse ou chegar pelo teclado, e a tabela embaixo tem os mesmos
 * números para quem não enxerga as barras. Sem JavaScript: é desenhado no
 * servidor. */
export function DailyBars({ title, summary, peakLabel, tableLabel, dayLabel, valueLabel, points }: {
  title: string;
  /** O total do período, ao lado do título. */
  summary: string;
  /** O valor do topo da escala (`Pico 12`). */
  peakLabel: string;
  tableLabel: string;
  dayLabel: string;
  valueLabel: string;
  points: DailyPoint[];
}) {
  const top = Math.max(1, ...points.map((point) => point.value));
  const last = points.length - 1;
  return (
    <figure className="grid min-w-0 gap-2 rounded-lg border border-border bg-card px-4 pt-3 pb-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{summary}</span>
      </figcaption>
      <div className="relative">
        <span aria-hidden="true" className="absolute top-0 left-0 text-caption leading-none text-muted-foreground">{peakLabel}</span>
        {/* O topo da escala e a linha de base, finos e no tom da grade. */}
        <div aria-hidden="true" className="absolute inset-x-0 top-4 border-t border-chart-grid" />
        <ol className="relative flex h-32 items-end gap-0.5 border-b border-chart-axis/60 pt-4">
          {points.map((point, index) => {
            const height = point.value > 0 ? Math.max(2, (point.value / top) * 100) : 0;
            // A dica não sai da caixa: nas pontas, ela encosta na borda.
            const edge = index < points.length / 4 ? "left-0" : index > (last * 3) / 4 ? "right-0" : "left-1/2 -translate-x-1/2";
            return (
              <li key={`${point.label}-${index}`} tabIndex={0} aria-label={`${point.label}: ${point.shown}`}
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span aria-hidden="true" style={{ height: `${height}%` }}
                  className="w-full max-w-6 rounded-t-[4px] bg-chart-1 transition-opacity group-hover:opacity-80" />
                <span role="tooltip" className={cn(
                  "pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-xs border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground group-hover:block group-focus-visible:block",
                  edge,
                )}>
                  <span className="text-muted-foreground">{point.label}</span> · <span className="font-medium tabular-nums">{point.shown}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <div aria-hidden="true" className="mt-1 flex justify-between text-caption text-muted-foreground">
          <span>{points[0]?.label}</span>
          <span>{points[last]?.label}</span>
        </div>
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{tableLabel}</summary>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="text-muted-foreground">
                <th scope="col" className="py-1 text-start font-normal">{dayLabel}</th>
                <th scope="col" className="py-1 text-end font-normal">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point, index) => (
                <tr key={`${point.label}-${index}`} className="border-t border-border/50">
                  <td className="py-1">{point.label}</td>
                  <td className="py-1 text-end tabular-nums">{point.shown}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
