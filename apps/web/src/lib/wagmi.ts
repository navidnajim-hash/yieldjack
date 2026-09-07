import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet, rainbowWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { localAnvil, robinhoodChainTestnet } from "@yieldjack/config";
import { createConfig, http } from "wagmi";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const projectId = walletConnectProjectId && walletConnectProjectId.length > 0 ? walletConnectProjectId : "yieldjack-local-dev";

// A deliberately curated connector list (rather than RainbowKit's `getDefaultConfig`, which
// pulls in every built-in wallet including Coinbase's Smart Wallet SDK) — this app only needs
// standard injected/WalletConnect-style connectors, and the curated list avoids an unrelated
// broken transitive dependency in the Coinbase Smart Wallet connector chain.
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [injectedWallet, metaMaskWallet, rainbowWallet, walletConnectWallet],
    },
  ],
  { appName: "YieldJack", projectId },
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [robinhoodChainTestnet, localAnvil],
  transports: {
    [robinhoodChainTestnet.id]: http(),
    [localAnvil.id]: http(),
  },
  ssr: false,
});
