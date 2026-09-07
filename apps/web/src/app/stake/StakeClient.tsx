"use client";

import { ClaimRewardPanel } from "@/components/stake/ClaimRewardPanel";
import { StakeForm } from "@/components/stake/StakeForm";
import { StakingStats } from "@/components/stake/StakingStats";
import { UnstakeForm } from "@/components/stake/UnstakeForm";
import { NetworkGuard } from "@/components/shared/NetworkGuard";
import { PrelaunchNotice } from "@/components/shared/PrelaunchNotice";
import { useJackStakingLiveness } from "@/hooks/useContractLiveness";
import { useJackStakingData } from "@/hooks/useJackStakingData";
import { STAKING_REWARDS_VARIABILITY_NOTICE } from "@/lib/constants";
import { getFeatureReadiness, productionManifest } from "@/lib/production/resolver";

export function StakeClient() {
  const jackToken = productionManifest.contracts.jackToken;
  const jackStakingRewards = productionManifest.contracts.jackStakingRewards;

  const configReadiness = getFeatureReadiness(productionManifest, "jackStaking");
  const { allLive } = useJackStakingLiveness(jackToken, jackStakingRewards);
  // Writes require both a fully configured manifest AND confirmed on-chain bytecode — a
  // syntactically valid address alone is never enough. See src/hooks/useContractLiveness.ts.
  const ready = configReadiness.configured && allLive;

  const data = useJackStakingData(jackToken, jackStakingRewards);

  const disabledReason = !configReadiness.configured
    ? "Available once JACK and staking are deployed and configured."
    : !allLive
      ? "Verifying on-chain contracts…"
      : undefined;

  return (
    <div className="flex flex-col gap-8">
      <PrelaunchNotice>{STAKING_REWARDS_VARIABILITY_NOTICE}</PrelaunchNotice>

      <NetworkGuard>
        <StakingStats
          ready={ready}
          jackDecimals={data.jackDecimals}
          walletJackBalance={data.walletJackBalance}
          stakedJack={data.stakedJack}
          totalStaked={data.totalStaked}
          rewardRate={data.rewardRate}
          periodFinish={data.periodFinish}
        />

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <StakeForm
            ready={ready}
            disabledReason={disabledReason}
            paused={data.stakingPaused ?? false}
            jackToken={jackToken}
            jackStakingRewards={jackStakingRewards}
            walletJackBalance={data.walletJackBalance}
            allowance={data.allowance}
            decimals={data.jackDecimals}
            onChanged={data.refetch}
          />
          <UnstakeForm
            ready={ready}
            disabledReason={disabledReason}
            jackStakingRewards={jackStakingRewards}
            stakedJack={data.stakedJack}
            decimals={data.jackDecimals}
            onChanged={data.refetch}
          />
          <ClaimRewardPanel
            ready={ready}
            disabledReason={disabledReason}
            jackStakingRewards={jackStakingRewards}
            claimableWeth={data.claimableWeth}
            hasStake={!!data.stakedJack && data.stakedJack > 0n}
            onChanged={data.refetch}
          />
        </div>
      </NetworkGuard>
    </div>
  );
}
