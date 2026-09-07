import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import type { Wallet, WalletList } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet, rainbowWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { robinhoodChainMainnet } from "@yieldjack/config";
import { createConfig, http } from "wagmi";
import { hasRealWalletConnectProjectId, selectWalletNames, type WalletName } from "./walletSelection";

const rawProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const effectiveMetaMaskProjectId = rawProjectId ?? "unused-metamask-walletconnect-fallback";

function buildWalletFactory(name: WalletName): () => Wallet {
  switch (name) {
    case "injected":
      return () => injectedWallet();
    case "metaMask":
      return () => metaMaskWallet({ projectId: effectiveMetaMaskProjectId });
    case "rainbow":
      return () => rainbowWallet({ projectId: rawProjectId! });
    case "walletConnect":
      return () => walletConnectWallet({ projectId: rawProjectId! });
  }
}

const wallets = selectWalletNames(rawProjectId).map((name) => buildWalletFactory(name));

const walletGroups: WalletList = [{ groupName: "Recommended", wallets }];

const connectors = connectorsForWallets(walletGroups, {
  appName: "YieldJack",
  projectId: hasRealWalletConnectProjectId(rawProjectId) ? rawProjectId! : "unused-no-walletconnect-wallets-configured",
});

/**
 * Production wagmi config: Robinhood Chain mainnet only. This app never adds a testnet or local
 * Anvil chain — every transaction control it renders is for the real Robinhood Chain mainnet
 * deployment (once one exists), and `NetworkGuard` refuses to enable writes on any other chain.
 */
export const wagmiConfig = createConfig({
  connectors,
  chains: [robinhoodChainMainnet],
  transports: {
    [robinhoodChainMainnet.id]: http(),
  },
  ssr: false,
});
