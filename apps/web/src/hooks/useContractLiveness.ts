"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import type { Address } from "@/lib/production/resolver";

export type LivenessStatus = "skipped" | "checking" | "live" | "absent" | "error";

/**
 * Checks, at runtime, whether an address configured in the production manifest actually has
 * contract bytecode deployed on the currently connected chain. This is deliberately separate
 * from the manifest's own config-level validation (`getFeatureReadiness`): a syntactically valid,
 * non-zero, non-demo address that simply isn't a deployed contract (a typo, or a contract that
 * later self-destructed, or an RPC that is lying) must never be treated as safe to write to.
 *
 * Any failure mode here — no address configured, no public client yet, or the RPC call itself
 * failing — resolves to a non-"live" status. Nothing in this hook can turn an uncertain read into
 * permission to enable a write.
 */
export function useContractLiveness(address: Address | null): LivenessStatus {
  const publicClient = usePublicClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["contract-bytecode", address, publicClient?.chain?.id],
    queryFn: async () => {
      if (!address || !publicClient) return null;
      const code = await publicClient.getBytecode({ address });
      return code ?? null;
    },
    enabled: !!address && !!publicClient,
    staleTime: 60_000,
    retry: 1,
  });

  if (!address) return "skipped";
  if (!publicClient || isLoading) return "checking";
  if (isError) return "error";
  return data ? "live" : "absent";
}

export interface JackStakingLiveness {
  jackTokenStatus: LivenessStatus;
  jackStakingRewardsStatus: LivenessStatus;
  /** True only when both contracts are confirmed to have live bytecode on the current chain. */
  allLive: boolean;
}

export function useJackStakingLiveness(
  jackToken: Address | null,
  jackStakingRewards: Address | null,
): JackStakingLiveness {
  const jackTokenStatus = useContractLiveness(jackToken);
  const jackStakingRewardsStatus = useContractLiveness(jackStakingRewards);
  return {
    jackTokenStatus,
    jackStakingRewardsStatus,
    allLive: jackTokenStatus === "live" && jackStakingRewardsStatus === "live",
  };
}

export interface PrizeSavingsLiveness {
  assetStatus: LivenessStatus;
  vaultStatus: LivenessStatus;
  prizeEngineStatus: LivenessStatus;
  allLive: boolean;
}

export function usePrizeSavingsLiveness(
  productionAsset: Address | null,
  productionVault: Address | null,
  productionPrizeEngine: Address | null,
): PrizeSavingsLiveness {
  const assetStatus = useContractLiveness(productionAsset);
  const vaultStatus = useContractLiveness(productionVault);
  const prizeEngineStatus = useContractLiveness(productionPrizeEngine);
  return {
    assetStatus,
    vaultStatus,
    prizeEngineStatus,
    allLive: assetStatus === "live" && vaultStatus === "live" && prizeEngineStatus === "live",
  };
}
