"use client";

import { useDrawHistory } from "@/hooks/useDrawHistory";
import { ROUND_STATE_NAMES } from "@/hooks/useYieldJackData";
import { formatJack, formatUsdg } from "@/lib/format";
import { AddressPill } from "@/components/shared/AddressPill";
import { AddressExplorerLink } from "@/components/shared/ExplorerLink";
import { EmptyState, LoadingSkeleton } from "@/components/shared/EmptyState";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function DrawHistoryTable() {
  const { rounds, isLoading, hasAny } = useDrawHistory();

  if (!hasAny && !isLoading) {
    return (
      <EmptyState
        title="No draws have closed yet"
        description="Once the first round closes on-chain, its result will appear here automatically."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3">Round</th>
            <th className="px-4 py-3">Prize</th>
            <th className="px-4 py-3">Winner</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Sponsor</th>
            <th className="px-4 py-3">Explorer</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && rounds.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-4">
                <LoadingSkeleton className="h-5 w-full" />
              </td>
            </tr>
          )}
          {rounds.map(({ roundId, round }) => (
            <tr key={roundId.toString()} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-foreground">#{roundId.toString()}</td>
              <td className="px-4 py-3 text-foreground">{formatUsdg(round.prizeAmount)} mUSDG</td>
              <td className="px-4 py-3">
                {round.winner === ZERO_ADDRESS ? (
                  <span className="text-muted">No eligible winner</span>
                ) : (
                  <AddressPill address={round.winner} />
                )}
              </td>
              <td className="px-4 py-3 text-muted">{ROUND_STATE_NAMES[round.state] ?? "Unknown"}</td>
              <td className="px-4 py-3 text-muted">
                {round.sponsorCount > 0n ? (
                  <span>
                    {formatUsdg(round.sponsorAmount)} mUSDG · {formatJack(round.sponsorJackBurned)} mJACK
                    burned
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">
                {round.winner !== ZERO_ADDRESS && <AddressExplorerLink address={round.winner} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
