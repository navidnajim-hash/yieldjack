import { fnv1aHex } from "./addressHash";
import { KNOWN_DEMO_OR_FORBIDDEN_ADDRESS_HASHES } from "./knownDemoAddresses";
import {
  PRODUCTION_CONTRACT_NAMES,
  type Address,
  type ManifestStatus,
  type ProductionContractName,
  type ProductionContracts,
  type ProductionManifest,
} from "./types";

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const ZERO_ADDRESS: Address = `0x${"0".repeat(40)}` as Address;

/**
 * Validates a single address field from the committed production manifest. Returns `null` — a
 * genuine "not configured" state, never a guessed or fallback value — for anything that isn't a
 * well-formed, non-zero, non-demo address. This is the one chokepoint every production address
 * in this app passes through, so it is deliberately strict and deliberately silent (no throwing):
 * a malformed manifest value degrades the app to "feature not ready" rather than crashing it.
 */
export function sanitizeAddress(value: unknown): Address | null {
  if (typeof value !== "string") return null;
  if (!ADDRESS_PATTERN.test(value)) return null;
  const lower = value.toLowerCase();
  if (lower === ZERO_ADDRESS) return null;
  if (KNOWN_DEMO_OR_FORBIDDEN_ADDRESS_HASHES.has(fnv1aHex(lower))) return null;
  return value as Address;
}

function sanitizeUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return value;
  } catch {
    return null;
  }
}

function sanitizeStatus(value: unknown): ManifestStatus {
  return value === "live" ? "live" : "prelaunch";
}

/**
 * Parses and validates the raw JSON content of `deployments/production/4663.json` into a
 * `ProductionManifest`. Never reads or falls back to `deployments/4663.json` (the mock-only
 * mainnet demo manifest) — this function only ever receives whatever is passed to it, and every
 * call site in this app passes it the statically-imported production manifest file. Every
 * address field is independently sanitized, so a single malformed or demo/forbidden value never
 * takes down the rest of the manifest — it just resolves to `null` ("not configured") for that
 * one field.
 */
export function parseProductionManifest(raw: unknown): ProductionManifest {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawContracts = (source.contracts && typeof source.contracts === "object" ? source.contracts : {}) as Record<
    string,
    unknown
  >;
  const rawLinks = (source.links && typeof source.links === "object" ? source.links : {}) as Record<string, unknown>;

  const contracts = Object.fromEntries(
    PRODUCTION_CONTRACT_NAMES.map((name: ProductionContractName) => [name, sanitizeAddress(rawContracts[name])]),
  ) as ProductionContracts;

  return {
    chainId: typeof source.chainId === "number" ? source.chainId : 4663,
    network: typeof source.network === "string" ? source.network : "robinhood-chain-mainnet",
    environment: "production",
    status: sanitizeStatus(source.status),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : null,
    contracts,
    links: { jackTradeUrl: sanitizeUrl(rawLinks.jackTradeUrl) },
    deploymentBlock: typeof source.deploymentBlock === "number" ? source.deploymentBlock : null,
  };
}
