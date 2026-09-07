"use client";

import { useCurrentRound, useRound } from "@/hooks/useYieldJackData";
import { formatUsdg } from "@/lib/format";
import { AddressPill } from "@/components/shared/AddressPill";
import { EmptyState } from "@/components/shared/EmptyState";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function RecentWinnerPanel() {
  const { roundId } = useCurrentRound();
  const previousRoundId = roundId !== undefined && roundId > 1n ? roundId - 1n : undefined;
  const { round } = useRound(previousRoundId);

  if (!round || round.winner === ZERO_ADDRESS) {
    return (
      <EmptyState
        title="No winner yet"
        description="The first completed round's winner will be shown here — genuinely, not a placeholder."
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <p className="text-xs uppercase tracking-wide text-muted">Most recent winner</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <AddressPill address={round.winner} />
        <span className="text-sm text-muted">won</span>
        <span className="text-xl font-semibold text-gold">{formatUsdg(round.prizeAmount)} mUSDG</span>
        <span className="text-sm text-muted">in round #{previousRoundId?.toString()}</span>
      </div>
    </div>
  );
}
