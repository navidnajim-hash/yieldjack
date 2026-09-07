import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import type { Wallet, WalletList } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet, rainbowWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { localAnvil, robinhoodChainMainnet, robinhoodChainTestnet } from "@yieldjack/config";
import { createConfig, http } from "wagmi";
import { hasRealWalletConnectProjectId, selectWalletNames, type WalletName } from "./walletSelection";

const rawProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// `rainbow` and `walletConnect` are only ever selected (see selectWalletNames) when a real
// project ID exists, so it's always the genuine one there. `metaMask` stays in the wallet list
// unconditionally (it's usable as a plain injected-provider connector without WalletConnect at
// all), but its own factory options still type-require *some* projectId string — a placeholder
// there is safe specifically because it only affects metaMask's own secondary QR/mobile-app
// WalletConnect fallback, never its primary injected-browser-extension detection, and (unlike
// `rainbow`/`walletConnect`) we are not claiming this app offers a WalletConnect-relay-backed
// connector in that case.
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

// A deliberately curated connector list (rather than RainbowKit's `getDefaultConfig`, which
// pulls in every built-in wallet including Coinbase's Smart Wallet SDK) — this app only needs
// standard injected/WalletConnect-style connectors, and the curated list avoids an unrelated
// broken transitive dependency in the Coinbase Smart Wallet connector chain.
const walletGroups: WalletList = [{ groupName: "Recommended", wallets }];

const connectors = connectorsForWallets(walletGroups, {
  appName: "YieldJack",
  // RainbowKit's types require a projectId even when every configured wallet is injected-only
  // (unused in that case — no wallet in `wallets` above talks to WalletConnect's relay then).
  projectId: hasRealWalletConnectProjectId(rawProjectId) ? rawProjectId! : "unused-no-walletconnect-wallets-configured",
});

export const wagmiConfig = createConfig({
  connectors,
  chains: [robinhoodChainTestnet, robinhoodChainMainnet, localAnvil],
  transports: {
    [robinhoodChainTestnet.id]: http(),
    [robinhoodChainMainnet.id]: http(),
    [localAnvil.id]: http(),
  },
  ssr: false,
});
