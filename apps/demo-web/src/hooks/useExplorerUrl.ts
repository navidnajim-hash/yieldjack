import { useChainId, useChains } from "wagmi";

/** Returns the current chain's block explorer base URL, or undefined if unknown. */
export function useExplorerBaseUrl(): string | undefined {
  const chainId = useChainId();
  const chains = useChains();
  return chains.find((c) => c.id === chainId)?.blockExplorers?.default.url;
}

export function txExplorerUrl(baseUrl: string | undefined, hash: string): string | undefined {
  if (!baseUrl) return undefined;
  return `${baseUrl}/tx/${hash}`;
}

export function addressExplorerUrl(baseUrl: string | undefined, address: string): string | undefined {
  if (!baseUrl) return undefined;
  return `${baseUrl}/address/${address}`;
}
