import rawProductionManifest from "../../../../../deployments/production/4663.json";
import { parseProductionManifest } from "./manifest";
import {
  FEATURE_REQUIREMENTS,
  type Address,
  type FeatureName,
  type ProductionContractName,
  type ProductionManifest,
} from "./types";

export type {
  Address,
  FeatureName,
  ProductionContractName,
  ProductionContracts,
  ProductionManifest,
} from "./types";
export { FEATURE_REQUIREMENTS, PRODUCTION_CONTRACT_NAMES } from "./types";
export { sanitizeAddress } from "./manifest";

/**
 * The one and only production manifest this app ever reads. Statically imported from
 * `deployments/production/4663.json` — never from `deployments/4663.json` (the mock-only
 * mainnet-demo manifest) or any other deployments file. There is no environment-variable or
 * runtime override for a contract address anywhere in this app: addresses are public
 * configuration, and the committed manifest is their single source of truth.
 */
export const productionManifest: ProductionManifest = parseProductionManifest(rawProductionManifest);

export interface FeatureReadiness {
  feature: FeatureName;
  /** True only when every contract that feature needs has a validated, non-null address. */
  configured: boolean;
  /** Which required contracts are still missing (or were rejected as malformed/demo/zero). */
  missing: ProductionContractName[];
}

/** Pure, synchronous, config-level readiness — does not touch the network. A contract address
 *  being present here means the manifest looks right; it does not by itself mean the address is
 *  safe to send a transaction to (see `useContractLiveness` for the on-chain bytecode check that
 *  gates writes). */
export function getFeatureReadiness(manifest: ProductionManifest, feature: FeatureName): FeatureReadiness {
  const required = FEATURE_REQUIREMENTS[feature];
  const missing = required.filter((name) => manifest.contracts[name] === null);
  return { feature, configured: missing.length === 0, missing };
}

export function getConfiguredAddress(manifest: ProductionManifest, name: ProductionContractName): Address | null {
  return manifest.contracts[name];
}

export const jackStakingReadiness = getFeatureReadiness(productionManifest, "jackStaking");
export const prizeSavingsReadiness = getFeatureReadiness(productionManifest, "prizeSavings");

export const isPrelaunch = productionManifest.status === "prelaunch";
