export type Address = `0x${string}`;

export const PRODUCTION_CONTRACT_NAMES = [
  "jackToken",
  "jackFeeRouter",
  "jackStakingRewards",
  "prizeReserve",
  "productionVault",
  "productionPrizeEngine",
  "productionAsset",
] as const;

export type ProductionContractName = (typeof PRODUCTION_CONTRACT_NAMES)[number];

export type ProductionContracts = Record<ProductionContractName, Address | null>;

export type ManifestStatus = "prelaunch" | "live";

export interface ProductionManifest {
  chainId: number;
  network: string;
  environment: "production";
  status: ManifestStatus;
  updatedAt: string | null;
  contracts: ProductionContracts;
  links: { jackTradeUrl: string | null };
  deploymentBlock: number | null;
}

/** Which on-chain contracts each user-facing feature needs before its transaction controls
 *  may be enabled. Deliberately explicit and centralized here — a feature can never come
 *  "half-live" because only one of its addresses was filled in. */
export const FEATURE_REQUIREMENTS = {
  jackStaking: ["jackToken", "jackStakingRewards"],
  prizeSavings: ["productionAsset", "productionVault", "productionPrizeEngine"],
} as const satisfies Record<string, readonly ProductionContractName[]>;

export type FeatureName = keyof typeof FEATURE_REQUIREMENTS;
