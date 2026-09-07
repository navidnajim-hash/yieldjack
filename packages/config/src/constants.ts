/** Mirrors YieldJackVault.MAX_PARTICIPANTS — a testnet-only cap. Kept in sync manually; see
 * docs/PRODUCTION_ROADMAP.md for the plan to remove this limit in production. */
export const MAX_PARTICIPANTS = 256;

export const USDG_DECIMALS = 6;
export const JACK_DECIMALS = 18;

export const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD" as const;

export const ROUND_STATE_LABELS = ["OPEN", "RANDOMNESS_REQUESTED", "AWARDED", "CLAIMED", "EXPIRED"] as const;

export type RoundStateLabel = (typeof ROUND_STATE_LABELS)[number];
