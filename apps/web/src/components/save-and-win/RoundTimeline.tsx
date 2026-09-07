import { EmptyState } from "@/components/shared/EmptyState";

const STAGES = ["Open", "Randomness requested", "Awarded", "Claimed"];

export function RoundTimeline() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <h3 className="text-base font-semibold text-foreground">Round timeline</h3>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STAGES.map((stage, index) => (
          <div key={stage} className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-dim">
              {stage}
            </span>
            {index < STAGES.length - 1 && <span className="text-muted-dim">→</span>}
          </div>
        ))}
      </div>
      <EmptyState title="No active round" description="Round progress will appear here once the production prize engine is live." />
    </div>
  );
}
