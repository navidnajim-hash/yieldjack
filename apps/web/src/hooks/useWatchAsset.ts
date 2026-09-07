"use client";

import { useCallback, useState } from "react";
import { useWalletClient } from "wagmi";
import type { Address } from "@/lib/production/resolver";

/**
 * Wraps EIP-747 `wallet_watchAsset` (via viem's `WalletClient.watchAsset`). Only ever called with
 * a validated, non-null, live production token address — see the JACK page, which only renders
 * the "Add to wallet" control once `jackToken` is configured.
 */
export function useWatchAsset() {
  const { data: walletClient } = useWalletClient();
  const [status, setStatus] = useState<"idle" | "pending" | "added" | "error">("idle");

  const watchAsset = useCallback(
    async (params: { address: Address; symbol: string; decimals: number }) => {
      if (!walletClient) return;
      setStatus("pending");
      try {
        await walletClient.watchAsset({
          type: "ERC20",
          options: { address: params.address, symbol: params.symbol.slice(0, 11), decimals: params.decimals },
        });
        setStatus("added");
      } catch {
        setStatus("error");
      }
    },
    [walletClient],
  );

  return { watchAsset, status, canWatch: !!walletClient };
}
