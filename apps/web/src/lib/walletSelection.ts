/**
 * Pure: decides which RainbowKit wallet factories to offer given a (possibly absent/fake)
 * WalletConnect project ID. Kept separate from wagmi.ts, and framework-agnostic (identifies
 * wallets by name rather than importing the actual RainbowKit wallet factory functions), so this
 * decision is unit-testable without needing to construct a real wagmi/RainbowKit config.
 *
 * Never initializes a WalletConnect-dependent connector with a fake project ID — without a real
 * one, only injected-provider wallets (a plain browser extension, no WalletConnect relay
 * involved) are offered.
 */
export type WalletName = "injected" | "metaMask" | "rainbow" | "walletConnect";

export function hasRealWalletConnectProjectId(projectId: string | undefined): boolean {
  return !!projectId && projectId.length > 0;
}

export function selectWalletNames(projectId: string | undefined): WalletName[] {
  const base: WalletName[] = ["injected", "metaMask"];
  if (!hasRealWalletConnectProjectId(projectId)) return base;
  return [...base, "rainbow", "walletConnect"];
}
