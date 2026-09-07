/**
 * Hashes (see `addressHash.ts`) of every mock/demo contract address that has ever been committed
 * to this repository's testnet/mainnet-demo deployment manifests (`deployments/31337.json`,
 * `deployments/46630.json`, `deployments/4663.json`), plus the canonical mainnet USDG address
 * that CLAUDE.md forbids this repository from ever integrating with in a live transaction.
 *
 * This file deliberately stores hashes, never the literal addresses: the production app's
 * BUILD-OUTPUT SAFETY SCAN (`scripts/production-output-safety-scan.mjs`, run in CI) fails the
 * build if the known mJACK/mUSDG addresses appear anywhere in `apps/web/out` — and a plain
 * denylist of literal address strings, imported by application code, would ship those exact
 * strings into the client JS bundle and trip that scan. Hashing avoids that while still letting
 * the production resolver (`manifest.ts`) reject any of these addresses if one is ever
 * copy-pasted into `deployments/production/4663.json` by mistake.
 *
 * See tests/productionResolver.test.ts for the tests proving this — they hold the literal
 * addresses (safe there: test files never ship in the Next.js client bundle) and confirm both
 * that they hash to exactly these values and that `sanitizeAddress` rejects every one of them.
 */
export const KNOWN_DEMO_OR_FORBIDDEN_ADDRESS_HASHES: ReadonlySet<string> = new Set([
  "50d51af2", // MockUSDG (mainnet demo, deployments/4663.json)
  "428661da", // MockJACK (mainnet demo, deployments/4663.json)
  "2db16c83", // MockYieldSource (mainnet demo, deployments/4663.json)
  "15227534", // DemoRandomnessProvider (mainnet demo, deployments/4663.json)
  "3c075088", // YieldJackVault (mainnet demo, deployments/4663.json)
  "a95fd889", // DemoPrizeEngine (mainnet demo, deployments/4663.json)
  "76a12c50", // SponsorRegistry (mainnet demo, deployments/4663.json)
  "db1a0853", // MockUSDG (testnet, deployments/46630.json)
  "5d1a3fae", // MockJACK (testnet, deployments/46630.json)
  "fca156a1", // MockYieldSource (testnet, deployments/46630.json)
  "96e3e87d", // DemoRandomnessProvider (testnet, deployments/46630.json)
  "df7da3cf", // YieldJackVault (testnet, deployments/46630.json)
  "cae0eaa2", // DemoPrizeEngine (testnet, deployments/46630.json)
  "0940b383", // SponsorRegistry (testnet, deployments/46630.json)
  "0e876598", // CANONICAL_MAINNET_USDG (packages/config/src/chains.ts) — CLAUDE.md: never a
  // constructor argument, never used in a live transaction.
]);
