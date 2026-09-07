import { defineChain } from "viem";
import { robinhood, robinhoodTestnet } from "viem/chains";

/**
 * Robinhood Chain Testnet — the only network this app ever sends transactions to. Re-exported
 * from viem's own built-in chain list (`viem/chains`) rather than hand-rolled, so this project
 * can never drift from viem's canonical definition (which also carries a `multicall3` address,
 * letting wagmi/viem batch multi-contract reads on this chain — our own hand-rolled definition
 * didn't have one). Verified to match the chain id, RPC, and explorer URL given in this
 * project's spec exactly before adopting it.
 */
export const robinhoodChainTestnet = robinhoodTestnet;

/**
 * Robinhood Chain (mainnet) — documented for reference and the Transparency page only. Also
 * re-exported from viem's built-in chain list. This app never connects a wallet to it, never
 * sends a transaction to it, and no deploy script in this repo is capable of broadcasting to
 * it. See docs/PRODUCTION_ROADMAP.md.
 */
export const robinhoodChainMainnet = robinhood;

/** Canonical mainnet USDG address — documentation only, never used in a live transaction. */
export const CANONICAL_MAINNET_USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;

/** Local Anvil chain id, used for the fully local demo flow. */
export const ANVIL_CHAIN_ID = 31337;

/** Local Anvil node — used only by `pnpm demo:*` for the fully local demo flow. No viem
 *  built-in exists for this (it isn't a public chain), so it stays hand-defined. */
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
