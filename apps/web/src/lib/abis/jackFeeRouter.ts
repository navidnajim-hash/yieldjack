/**
 * Hand-extracted ABI fragment for `packages/contracts/src/fees/JackFeeRouter.sol`, limited to
 * the read functions this app's Transparency page uses to confirm the router's wiring on-chain.
 * Every name, input, output, and mutability below is copied verbatim from that contract's
 * source. See the note in `jackStakingRewards.ts` about full ABI regeneration via
 * `pnpm contracts:build && pnpm sync:abis` once Foundry is available in this environment.
 */
export const jackFeeRouterAbi = [
  {
    type: "function",
    name: "configured",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "jack",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "staking",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "stakerShareBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
  },
  {
    type: "function",
    name: "prizeReserveShareBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
  },
  {
    type: "function",
    name: "operationsShareBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
  },
] as const;
