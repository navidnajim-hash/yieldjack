"use client";

import { useCurrentRound, useEstimatedCurrentPrize, useVaultSummary } from "@/hooks/useYieldJackData";
import { formatUsdg } from "@/lib/format";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";

export function LiveStats() {
  const { totalPrincipal, contract: vault, isLoading: vaultLoading } = useVaultSummary();
  const { round, isLoading: roundLoading } = useCurrentRound();
  const { amount: currentPrize, isLoading: prizeLoading } = useEstimatedCurrentPrize();

  if (!vault) {
    return (
      <EmptyState
        title="Not deployed on this network yet"
        description="Live testnet statistics will appear here once YieldJack's contracts are deployed and the frontend points at the deployment manifest."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard
        label="Total deposited (testnet)"
        value={`${formatUsdg(totalPrincipal)} mUSDG`}
        isLoading={vaultLoading}
        hint="Read live from YieldJackVault — never fabricated"
      />
      <StatCard
        label="Current prize"
        value={`${formatUsdg(currentPrize)} mUSDG`}
        isLoading={prizeLoading}
        accent="gold"
      />
      <StatCard
        label="Eligible participants this round"
        value={round ? round.participantCount.toString() : "—"}
        isLoading={roundLoading}
        accent="primary"
      />
    </div>
  );
}
