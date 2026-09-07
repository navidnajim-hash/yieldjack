"use client";

import { useDrawHistory } from "@/hooks/useDrawHistory";
import { useCurrentRound } from "@/hooks/useYieldJackData";
import { formatTimestamp } from "@/lib/format";

const STEPS = [
  { state: 0, label: "Open" },
  { state: 1, label: "Randomness requested" },
  { state: 2, label: "Awarded" },
  { state: 3, label: "Claimed" },
] as const;

/**
 * Split in two, deliberately: the currently open round (by definition always in the OPEN
 * state — a round only stops being "current" once it closes) never actually progresses through
 * RANDOMNESS_REQUESTED / AWARDED / CLAIMED itself, so a single timeline driven only by the
 * current round could never show those states. The step-by-step draw-progress timeline below
 * is instead driven by the most recently *closed* round, which is where those states actually
 * happen.
 */
export function DrawStatusTimeline() {
  return (
    <div className="flex flex-col gap-4">
      <CurrentRoundCard />
      <MostRecentDrawTimeline />
    </div>
  );
}

function CurrentRoundCard() {
  const { round, roundId } = useCurrentRound();
  if (!round) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Round #{roundId?.toString() ?? "—"} — current savings round
        </h3>
        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">Open for deposits</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-muted">Opened</dt>
          <dd className="text-foreground">{formatTimestamp(round.startTime)}</dd>
        </div>
        <div>
          <dt className="text-muted">Earliest permissionless close</dt>
          <dd className="text-foreground">{formatTimestamp(round.endTime)}</dd>
        </div>
      </dl>
    </div>
  );
}

function MostRecentDrawTimeline() {
  const { rounds, hasAny } = useDrawHistory();

  if (!hasAny || rounds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/40 p-5 text-center text-sm text-muted">
        No round has closed yet — draw progress (randomness, award, claim) will appear here once
        one does.
      </div>
    );
  }

  // `useDrawHistory` returns most-recent-first.
  const { roundId, round } = rounds[0]!;
  const isExpired = round.state === 4;
  const activeIndex = isExpired ? STEPS.length : round.state;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Round #{roundId.toString()} — most recent draw</h3>
        {isExpired && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs text-danger">Expired</span>}
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
          <dt className="text-muted">Closed</dt>
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
        <div>
          <dt className="text-muted">Prize</dt>
          <dd className="text-foreground">{round.claimed ? "Claimed" : isExpired ? "Rolled over" : "Pending"}</dd>
        </div>
      </dl>

      {rounds.length > 1 && (
        <p className="mt-3 text-xs text-muted">
          {rounds.filter(({ round: r }) => (r.state === 1 || (r.state === 2 && !r.claimed))).length > 0
            ? "Older rounds still need attention too — see the testnet controls below."
            : "See the Draws page for the full history."}
        </p>
      )}
    </div>
  );
}
