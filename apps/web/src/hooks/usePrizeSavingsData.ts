"use client";

import { erc20Abi } from "@/lib/abis/erc20";
import type { Address } from "@/lib/production/resolver";
import { useAccount, useReadContracts } from "wagmi";

export interface PrizeSavingsAssetData {
  assetDecimals: number | undefined;
  assetSymbol: string | undefined;
  walletAssetBalance: bigint | undefined;
  isLoading: boolean;
}

/**
 * Reads the wallet's balance of the configured production savings asset. This is intentionally
 * the *only* live read this app performs for Save & Win before a production vault exists — there
 * is no vault or prize-engine contract to read `principal`, `currentPrize`, round state, or
 * eligibility weight from yet (see docs/PRODUCTION_ROADMAP.md and the note in
 * `src/app/app/page.tsx`). Wiring those in later is a matter of adding the real vault/prize-engine
 * ABI here once those contracts exist and are deployed — never inventing one ahead of time.
 */
export function usePrizeSavingsAssetData(productionAsset: Address | null): PrizeSavingsAssetData {
  const { address: account } = useAccount();
  const ready = !!productionAsset;

  const { data, isLoading } = useReadContracts({
    allowFailure: true,
    query: { enabled: ready, refetchOnWindowFocus: false },
    contracts: [
      { address: productionAsset ?? undefined, abi: erc20Abi, functionName: "decimals" },
      { address: productionAsset ?? undefined, abi: erc20Abi, functionName: "symbol" },
      {
        address: productionAsset ?? undefined,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: account ? [account] : undefined,
      },
    ],
  });

  const at = <T,>(index: number): T | undefined => {
    const entry = data?.[index];
    return entry && entry.status === "success" ? (entry.result as T) : undefined;
  };

  return {
    assetDecimals: at<number>(0),
    assetSymbol: at<string>(1),
    walletAssetBalance: at<bigint>(2),
    isLoading: ready && isLoading,
  };
}
