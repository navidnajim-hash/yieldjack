import { MetricCard } from "@/components/shared/MetricCard";

export function CurrentRoundCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Current round</h3>
        <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
          Available at launch
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Prize amount" value="—" />
        <MetricCard label="Round state" value="—" />
        <MetricCard label="Countdown" value="—" />
        <MetricCard label="Eligible savers" value="—" />
      </div>
    </div>
  );
}
