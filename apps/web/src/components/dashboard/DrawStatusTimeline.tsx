"use client";

import { useCurrentRound } from "@/hooks/useYieldJackData";
import { formatTimestamp } from "@/lib/format";

const STEPS = [
  { state: 0, label: "Open" },
  { state: 1, label: "Randomness requested" },
  { state: 2, label: "Awarded" },
  { state: 3, label: "Claimed" },
] as const;

export function DrawStatusTimeline() {
  const { round, roundId } = useCurrentRound();

  if (!round) return null;

  const isExpired = round.state === 4;
  const activeIndex = isExpired ? STEPS.length : round.state;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Round #{roundId?.toString() ?? "—"} status
        </h3>
        {isExpired && (
          <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs text-danger">Expired</span>
        )}
      </div>

      <ol className="flex flex-wrap items-center gap-2" aria-label="Draw progress">
        {STEPS.map((step, i) => {
          const done = i < activeIndex;
          const current = i === activeIndex;
          return (
            <li key={step.state} className="flex items-center gap-2">
              <span
                className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium ${
                  done
                    ? "bg-primary/20 text-primary"
                    : current
                      ? "bg-gold/20 text-gold"
                      : "bg-surface-hover text-muted"
                }`}
              >
                {done ? "✓" : i + 1} {step.label}
              </span>
              {i < STEPS.length - 1 && <span className="text-border-strong">→</span>}
            </li>
          );
        })}
      </ol>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-muted">Opened</dt>
          <dd className="text-foreground">{formatTimestamp(round.startTime)}</dd>
        </div>
        <div>
          <dt className="text-muted">Ends</dt>
          <dd className="text-foreground">{formatTimestamp(round.endTime)}</dd>
        </div>
        <div>
          <dt className="text-muted">Awarded</dt>
          <dd className="text-foreground">{formatTimestamp(round.awardedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted">Claim deadline</dt>
          <dd className="text-foreground">{formatTimestamp(round.claimDeadline)}</dd>
        </div>
      </dl>
    </div>
  );
}
