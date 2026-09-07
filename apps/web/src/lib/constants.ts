export const JACK_DECIMALS = 18;
export const WETH_DECIMALS = 18;

/** JACK's fixed launch supply target. Only presented as confirmed/live in the UI once the real
 *  token manifest (`jackToken` in the production manifest) is configured — see the JACK page. */
export const JACK_LAUNCH_SUPPLY_TARGET = 1_000_000_000n;

/** The documented `JackFeeRouter` creator-fee revenue split, in basis points — matches the
 *  contract's immutable `stakerShareBps` / `prizeReserveShareBps` / `operationsShareBps`
 *  (see packages/contracts/src/fees/JackFeeRouter.sol). Used as display copy before the router
 *  is configured; once `jackFeeRouter` is configured, pages read the live on-chain values
 *  instead and only fall back to these documented figures if that read fails. */
export const DOCUMENTED_REVENUE_SPLIT_BPS = {
  stakers: 7000,
  prizeReserve: 2000,
  operations: 1000,
} as const;

export const REVENUE_SPLIT_CLARIFICATION =
  "These percentages apply to YieldJack's creator-fee revenue after applicable Pons protocol fees—not to gross trading volume.";

export const STAKING_REWARDS_VARIABILITY_NOTICE =
  "Rewards are variable, may be zero, and depend on eligible JACK trading activity.";

export const X_URL = "https://x.com/YieldJack";
export const GITHUB_URL = "https://github.com/navidnajim-hash/yieldjack";
export const CANONICAL_ORIGIN = "https://yieldjack.fun";
