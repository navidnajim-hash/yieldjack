"use client";

import { erc20Abi } from "@/lib/abis/erc20";
import type { Address } from "@/lib/production/resolver";
import { useReadContracts } from "wagmi";

export interface JackTokenInfo {
  decimals: number | undefined;
  symbol: string | undefined;
  name: string | undefined;
  totalSupply: bigint | undefined;
  isLoading: boolean;
}

export function useJackTokenInfo(jackToken: Address | null): JackTokenInfo {
  const ready = !!jackToken;

  const { data, isLoading } = useReadContracts({
    allowFailure: true,
    query: { enabled: ready, refetchOnWindowFocus: false },
    contracts: [
      { address: jackToken ?? undefined, abi: erc20Abi, functionName: "decimals" },
      { address: jackToken ?? undefined, abi: erc20Abi, functionName: "symbol" },
      {
        address: jackToken ?? undefined,
        abi: [
          { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
        ] as const,
        functionName: "name",
      },
      {
        address: jackToken ?? undefined,
        abi: [
          {
            type: "function",
            name: "totalSupply",
            stateMutability: "view",
            inputs: [],
            outputs: [{ name: "", type: "uint256" }],
          },
        ] as const,
        functionName: "totalSupply",
      },
    ],
  });

  const at = <T,>(index: number): T | undefined => {
    const entry = data?.[index];
    return entry && entry.status === "success" ? (entry.result as T) : undefined;
  };

  return {
    decimals: at<number>(0),
    symbol: at<string>(1),
    name: at<string>(2),
    totalSupply: at<bigint>(3),
    isLoading: ready && isLoading,
  };
}
