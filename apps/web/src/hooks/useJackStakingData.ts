"use client";

import { erc20Abi } from "@/lib/abis/erc20";
import { jackStakingRewardsAbi } from "@/lib/abis/jackStakingRewards";
import { JACK_DECIMALS } from "@/lib/constants";
import type { Address } from "@/lib/production/resolver";
import { useAccount, useReadContracts } from "wagmi";

export interface JackStakingData {
  jackDecimals: number;
  walletJackBalance: bigint | undefined;
  stakedJack: bigint | undefined;
  totalStaked: bigint | undefined;
  claimableWeth: bigint | undefined;
  rewardRate: bigint | undefined;
  periodFinish: bigint | undefined;
  allowance: bigint | undefined;
  stakingPaused: boolean | undefined;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Aggregates every on-chain read the Stake JACK page needs into a single multicall. Only ever
 * queries once both `jackToken` and `jackStakingRewards` are configured, validated production
 * addresses — see `useJackStakingLiveness` for the separate runtime bytecode check that gates
 * whether writes may actually be sent.
 */
export function useJackStakingData(jackToken: Address | null, jackStakingRewards: Address | null): JackStakingData {
  const { address: account } = useAccount();
  const ready = !!jackToken && !!jackStakingRewards;

  const { data, isLoading, refetch } = useReadContracts({
    allowFailure: true,
    query: { enabled: ready, refetchOnWindowFocus: false },
    contracts: [
      { address: jackToken ?? undefined, abi: erc20Abi, functionName: "decimals" },
      {
        address: jackToken ?? undefined,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: account ? [account] : undefined,
      },
      {
        address: jackStakingRewards ?? undefined,
        abi: jackStakingRewardsAbi,
        functionName: "balanceOf",
        args: account ? [account] : undefined,
      },
      { address: jackStakingRewards ?? undefined, abi: jackStakingRewardsAbi, functionName: "totalStaked" },
      {
        address: jackStakingRewards ?? undefined,
        abi: jackStakingRewardsAbi,
        functionName: "earned",
        args: account ? [account] : undefined,
      },
      { address: jackStakingRewards ?? undefined, abi: jackStakingRewardsAbi, functionName: "rewardRate" },
      { address: jackStakingRewards ?? undefined, abi: jackStakingRewardsAbi, functionName: "periodFinish" },
      {
        address: jackToken ?? undefined,
        abi: erc20Abi,
        functionName: "allowance",
        args: account && jackStakingRewards ? [account, jackStakingRewards] : undefined,
      },
      { address: jackStakingRewards ?? undefined, abi: jackStakingRewardsAbi, functionName: "paused" },
    ],
  });

  const at = <T,>(index: number): T | undefined => {
    const entry = data?.[index];
    return entry && entry.status === "success" ? (entry.result as T) : undefined;
  };

  return {
    jackDecimals: at<number>(0) ?? JACK_DECIMALS,
    walletJackBalance: at<bigint>(1),
    stakedJack: at<bigint>(2),
    totalStaked: at<bigint>(3),
    claimableWeth: at<bigint>(4),
    rewardRate: at<bigint>(5),
    periodFinish: at<bigint>(6),
    allowance: at<bigint>(7),
    stakingPaused: at<boolean>(8),
    isLoading: ready && isLoading,
    refetch,
  };
}
