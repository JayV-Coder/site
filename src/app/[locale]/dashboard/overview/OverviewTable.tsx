import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column { label: string; numeric?: boolean }

/** Uma tabela simples do Dashboard: rótulos discretos em cima e os números
 * alinhados à direita, em colunas de largura fixa por dígito. Rola de lado no
 * celular em vez de apertar o texto. */
export function OverviewTable({ columns, rows }: { columns: Column[]; rows: { key: string; cells: ReactNode[] }[] }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[26rem] text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.label} scope="col" className={cn("pb-2 text-xs font-normal whitespace-nowrap text-muted-foreground", column.numeric ? "ps-4 text-end" : "text-start")}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-border/60">
              {row.cells.map((cell, index) => (
                <td key={index} className={cn("py-2 align-middle", columns[index]?.numeric ? "ps-4 text-end whitespace-nowrap tabular-nums" : "min-w-36 pe-3")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Pares rótulo/valor em grade, como a ficha de um usuário. */
export function OverviewFacts({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 @xl:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="grid min-w-0 gap-0.5">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="min-w-0 text-sm font-medium break-words tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
