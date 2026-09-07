import { defineChain } from "viem";

/**
 * Robinhood Chain Testnet — the only network this app ever sends transactions to.
 * Values are exactly as specified; never invent or guess an RPC/explorer URL.
 */
export const robinhoodChainTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Testnet Explorer",
      url: "https://explorer.testnet.chain.robinhood.com",
    },
  },
  testnet: true,
});

/**
 * Robinhood Chain (mainnet) — documented for reference and the Transparency page only.
 * This app never connects a wallet to it, never sends a transaction to it, and no deploy
 * script in this repo is capable of broadcasting to it. See docs/PRODUCTION_ROADMAP.md.
 */
export const robinhoodChainMainnet = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
  testnet: false,
});

/** Canonical mainnet USDG address — documentation only, never used in a live transaction. */
export const CANONICAL_MAINNET_USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;

/** Local Anvil chain id, used for the fully local demo flow. */
export const ANVIL_CHAIN_ID = 31337;

/** Local Anvil node — used only by `pnpm demo:*` for the fully local demo flow. */
export const localAnvil = defineChain({
  id: ANVIL_CHAIN_ID,
  name: "Local Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
  testnet: true,
});

export const SUPPORTED_CHAIN_IDS = [robinhoodChainTestnet.id, ANVIL_CHAIN_ID] as const;
