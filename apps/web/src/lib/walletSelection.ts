/**
 * Pure: decides which RainbowKit wallet factories to offer given a (possibly absent)
 * WalletConnect project ID. Framework-agnostic (identifies wallets by name rather than importing
 * the actual RainbowKit wallet factory functions), so this decision is unit-testable without
 * needing to construct a real wagmi/RainbowKit config.
 *
 * Never initializes a WalletConnect-dependent connector without a real project ID — without one,
 * only injected-provider wallets (a plain browser extension, no WalletConnect relay involved) are
 * offered, and they work exactly as well without any WalletConnect configuration at all.
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
