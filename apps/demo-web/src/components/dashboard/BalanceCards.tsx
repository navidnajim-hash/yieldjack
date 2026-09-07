"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  useCurrentRound,
  useEstimatedChance,
  useEstimatedCurrentPrize,
  useTokenBalance,
  useVaultSummary,
} from "@/hooks/useYieldJackData";
import { formatBps, formatDuration, formatUsdg } from "@/lib/format";
import { StatCard } from "./StatCard";

function useCountdownToTimestamp(target: bigint | undefined): string {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (target === undefined) return "—";
  const remaining = Number(target) - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return "Round ended — anyone can close it";
  return formatDuration(remaining);
}

export function BalanceCards() {
  const { isConnected } = useAccount();
  const { data: walletBalance, isLoading: balanceLoading } = useTokenBalance("MockUSDG");
  const { principal, isLoading: vaultLoading } = useVaultSummary();
  const { bps: chanceBps, isLoading: chanceLoading } = useEstimatedChance();
  const { round, isLoading: roundLoading } = useCurrentRound();
  const { amount: currentPrize, isLoading: prizeLoading } = useEstimatedCurrentPrize();
  const countdown = useCountdownToTimestamp(round?.endTime);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="Wallet mUSDG"
        value={`${formatUsdg(walletBalance as bigint | undefined)}`}
        isLoading={isConnected && balanceLoading}
      />
      <StatCard
        label="Your deposit"
        value={`${formatUsdg(principal)}`}
        isLoading={isConnected && vaultLoading}
      />
      <StatCard
        label="Estimated chance"
        value={formatBps(chanceBps)}
        isLoading={isConnected && chanceLoading}
        hint="This round, if it closed now"
      />
      <StatCard
        label="Current prize"
        value={`${formatUsdg(currentPrize)}`}
        isLoading={prizeLoading}
        accent="gold"
        className="animate-yj-glow"
        hint="Escrowed prize + realized yield not yet pulled in"
      />
      <StatCard label="Draw countdown" value={countdown} isLoading={roundLoading} accent="primary" />
    </div>
  );
}
