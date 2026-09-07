"use client";

import { useEffect } from "react";
import { MetricCard } from "@/components/shared/MetricCard";
import { PrelaunchNotice } from "@/components/shared/PrelaunchNotice";
import { TxButton } from "@/components/shared/TxButton";
import { TxStatus } from "@/components/shared/TxStatus";
import { useTxState } from "@/hooks/useTxState";
import { jackStakingRewardsAbi } from "@/lib/abis/jackStakingRewards";
import { formatTokenAmount } from "@/lib/format";
import { WETH_DECIMALS } from "@/lib/constants";
import type { Address } from "@/lib/production/resolver";

/** Claiming and exiting are never gated by the staking contract's pause state, same as
 *  unstaking — see the note in `UnstakeForm.tsx`. */
export function ClaimRewardPanel({
  ready,
  disabledReason,
  jackStakingRewards,
  claimableWeth,
  hasStake,
  onChanged,
}: {
  ready: boolean;
  disabledReason?: string;
  jackStakingRewards: Address | null;
  claimableWeth: bigint | undefined;
  hasStake: boolean;
  onChanged: () => void;
}) {
  const claimTx = useTxState();
  const exitTx = useTxState();

  useEffect(() => {
    if (claimTx.phase === "success") onChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimTx.phase]);

  useEffect(() => {
    if (exitTx.phase === "success") onChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exitTx.phase]);

  const noReward = claimableWeth === undefined || claimableWeth === 0n;

  const handleClaim = async () => {
    if (!jackStakingRewards) return;
    try {
      await claimTx.send({ address: jackStakingRewards, abi: jackStakingRewardsAbi, functionName: "claimReward" });
    } catch {
      // Surfaced via claimTx.errorMessage below.
    }
  };

  const handleExit = async () => {
    if (!jackStakingRewards) return;
    try {
      await exitTx.send({ address: jackStakingRewards, abi: jackStakingRewardsAbi, functionName: "exit" });
    } catch {
      // Surfaced via exitTx.errorMessage below.
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <h3 className="text-base font-semibold text-foreground">Rewards</h3>
      <MetricCard label="Claimable WETH" value={formatTokenAmount(claimableWeth, WETH_DECIMALS)} accent />
      <div className="flex flex-col gap-2 sm:flex-row">
        <TxButton
          phase={claimTx.phase}
          onClick={handleClaim}
          disabled={!ready || noReward}
          disabledReason={!ready ? disabledReason : "Nothing to claim yet."}
          idleLabel="Claim WETH"
        />
        <TxButton
          phase={exitTx.phase}
          onClick={handleExit}
          disabled={!ready || !hasStake}
          disabledReason={!ready ? disabledReason : "No staked balance to exit."}
          idleLabel="Unstake all & claim"
          variant="secondary"
        />
      </div>
      <TxStatus
        phase={claimTx.phase !== "idle" ? claimTx.phase : exitTx.phase}
        hash={claimTx.phase !== "idle" ? claimTx.hash : exitTx.hash}
        errorMessage={claimTx.phase !== "idle" ? claimTx.errorMessage : exitTx.errorMessage}
      />
      {!ready && disabledReason && <PrelaunchNotice>{disabledReason}</PrelaunchNotice>}
    </div>
  );
}
