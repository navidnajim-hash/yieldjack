import type { ReactNode } from "react";

/**
 * A single labeled figure. `value` should already be formatted (or "—" when unavailable) — this
 * component never fabricates a placeholder number, it only lays one out.
 */
export function MetricCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span
        className={`break-words font-tabular font-mono text-2xl font-semibold tracking-tight sm:text-3xl ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </span>
      {hint && <span className="text-xs text-muted-dim">{hint}</span>}
    </div>
  );
}
