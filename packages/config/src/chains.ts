import { defineChain } from "viem";
import { robinhood, robinhoodTestnet } from "viem/chains";

/**
 * Robinhood Chain Testnet. Re-exported from viem's own built-in chain list (`viem/chains`)
 * rather than hand-rolled, so this project can never drift from viem's canonical definition
 * (which also carries a `multicall3` address, letting wagmi/viem batch multi-contract reads on
 * this chain — our own hand-rolled definition didn't have one). Verified to match the chain id,
 * RPC, and explorer URL given in this project's spec exactly before adopting it.
 */
export const robinhoodChainTestnet = robinhoodTestnet;

/**
 * Robinhood Chain (mainnet). Also re-exported from viem's built-in chain list. The only
 * mainnet deployment this app ever connects a wallet to is the MOCK-ONLY MAINNET DEMO deployed
 * by `script/DeployMainnetDemo.s.sol` — mUSDG and mJACK remain worthless mock tokens there, no
 * real USDG or real $JACK is ever involved, and every page shows the mainnet-demo warning
 * banner while connected to it. See CLAUDE.md and docs/PRODUCTION_ROADMAP.md for the absolute,
 * still-standing prohibition on a real-value deployment.
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

export const SUPPORTED_CHAIN_IDS = [robinhoodChainTestnet.id, robinhoodChainMainnet.id, ANVIL_CHAIN_ID] as const;
