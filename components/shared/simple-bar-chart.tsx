"use client";
import { cn } from "@/lib/utils";
export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
}
export function SimpleBarChart({
  data,
  className,
}: {
  data: ChartDataPoint[];
  className?: string;
}) {
  const max = Math.max(...data.map((point) => point.value), 1);
  return (
    <div className={cn("space-y-4", className)}>
      {data.length ? (
        <>
          <div
            className="flex h-32 items-end gap-1.5 overflow-x-auto border-b pb-1"
            role="img"
            aria-label={data.map((point) => `${point.label}: ${point.value}`).join("; ")}
          >
            {data.map((point, i) => (
              <div
                key={point.date ?? `${point.label}-${i}`}
                className="flex h-full min-w-[12px] flex-1 flex-col justify-end gap-1"
                title={`${point.label}: ${point.value}`}
              >
                <span
                  className="bg-primary/80 block rounded-t-sm"
                  style={{ height: `${Math.max(point.value ? 3 : 0, (point.value / max) * 94)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="text-muted-foreground flex justify-between gap-3 text-xs">
            <span>{data[0]?.label}</span>
            <span>{data[data.length - 1]?.label}</span>
          </div>
          <details>
            <summary className="text-muted-foreground min-h-11 py-3 text-sm">
              Read the values
            </summary>
            <dl className="divide-y">
              {data.map((point, i) => (
                <div
                  key={point.date ?? `${point.label}-${i}`}
                  className="flex justify-between gap-4 py-2 text-sm"
                >
                  <dt>{point.label}</dt>
                  <dd className="tabular-nums">{point.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        </>
      ) : (
        <p className="text-muted-foreground py-6 text-sm">No recorded work in this period.</p>
      )}
    </div>
  );
}
