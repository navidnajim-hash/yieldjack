import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fnv1aHex } from "@/lib/production/addressHash";
import { parseProductionManifest, sanitizeAddress } from "@/lib/production/manifest";
import { getFeatureReadiness } from "@/lib/production/resolver";
import { KNOWN_DEMO_OR_FORBIDDEN_ADDRESS_HASHES } from "@/lib/production/knownDemoAddresses";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VALID_A = "0x1111111111111111111111111111111111111111";
const VALID_B = "0x2222222222222222222222222222222222222222";
const VALID_C = "0x3333333333333333333333333333333333333333";

// The literal demo/mock addresses live here, in a test file, deliberately — test files never
// ship in the Next.js client bundle, unlike anything under src/. See the note atop
// src/lib/production/knownDemoAddresses.ts for why application code holds only hashes of these.
const KNOWN_DEMO_ADDRESSES = [
  "0x0141023b7efa2d46c0595ab5d86b27f9ba6ed58b", // MockUSDG (mainnet demo)
  "0x7f112b5aa94766c292c975bd622fc9cf930242ff", // MockJACK (mainnet demo)
  "0x83d74d6d73b93093eb77b85ea5854727ef5ace9b", // MockYieldSource (mainnet demo)
  "0xaeb1d00f7f04932769e6efcc25286251b95dd347", // DemoRandomnessProvider (mainnet demo)
  "0x33a4ee4a25a552bd9fb84e2b01753c64cd71ebe7", // YieldJackVault (mainnet demo)
  "0x9a99d2e6784d98a2c9c4aef610f56e8ce2300b38", // DemoPrizeEngine (mainnet demo)
  "0x0a5a16cf318efda288553567ab9a3c146008e9b3", // SponsorRegistry (mainnet demo)
  "0x0adea73eb64b0eb9e48b86880784ca06df77c665", // MockUSDG (testnet)
  "0xb91364c52ec2d8c40d4aae8891e5c93ea9632de0", // MockJACK (testnet)
  "0x29ec4884f3c1c9301541324ff3cc201b4e698d10", // MockYieldSource (testnet)
  "0x2aa855dde4495415961beb8c3a257daffab05f0d", // DemoRandomnessProvider (testnet)
  "0xa3027ce9ad5c2f5005cb728dd2a77061da942f76", // YieldJackVault (testnet)
  "0xc682c9db096d737d780e337e6e6dc97fc3fb23e2", // DemoPrizeEngine (testnet)
  "0xf9ccbb7ca435bb15ab76dff72a45871526aac71a", // SponsorRegistry (testnet)
  "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", // CANONICAL_MAINNET_USDG
];

describe("getFeatureReadiness — jackStaking", () => {
  it("is not configured when both addresses are missing", () => {
    const manifest = parseProductionManifest({});
    const readiness = getFeatureReadiness(manifest, "jackStaking");
    expect(readiness.configured).toBe(false);
    expect(readiness.missing).toEqual(["jackToken", "jackStakingRewards"]);
  });

  it("stays not configured when only jackToken is set (cannot go half-live)", () => {
    const manifest = parseProductionManifest({ contracts: { jackToken: VALID_A } });
    const readiness = getFeatureReadiness(manifest, "jackStaking");
    expect(readiness.configured).toBe(false);
    expect(readiness.missing).toEqual(["jackStakingRewards"]);
  });

  it("stays not configured when only jackStakingRewards is set", () => {
    const manifest = parseProductionManifest({ contracts: { jackStakingRewards: VALID_A } });
    const readiness = getFeatureReadiness(manifest, "jackStaking");
    expect(readiness.configured).toBe(false);
  });

  it("is configured only once both required addresses are present", () => {
    const manifest = parseProductionManifest({
      contracts: { jackToken: VALID_A, jackStakingRewards: VALID_B },
    });
    const readiness = getFeatureReadiness(manifest, "jackStaking");
    expect(readiness.configured).toBe(true);
    expect(readiness.missing).toEqual([]);
  });
});

describe("getFeatureReadiness — prizeSavings", () => {
  it("is not configured when all three addresses are missing", () => {
    const manifest = parseProductionManifest({});
    const readiness = getFeatureReadiness(manifest, "prizeSavings");
    expect(readiness.configured).toBe(false);
    expect(readiness.missing).toEqual(["productionAsset", "productionVault", "productionPrizeEngine"]);
  });

  it("stays not configured with only two of three addresses set", () => {
    const manifest = parseProductionManifest({
      contracts: { productionAsset: VALID_A, productionVault: VALID_B },
    });
    const readiness = getFeatureReadiness(manifest, "prizeSavings");
    expect(readiness.configured).toBe(false);
    expect(readiness.missing).toEqual(["productionPrizeEngine"]);
  });

  it("is configured only once all three required addresses are present", () => {
    const manifest = parseProductionManifest({
      contracts: { productionAsset: VALID_A, productionVault: VALID_B, productionPrizeEngine: VALID_C },
    });
    const readiness = getFeatureReadiness(manifest, "prizeSavings");
    expect(readiness.configured).toBe(true);
  });

  it("a malformed address counts as missing, not configured", () => {
    const manifest = parseProductionManifest({
      contracts: { productionAsset: "not-an-address", productionVault: VALID_B, productionPrizeEngine: VALID_C },
    });
    const readiness = getFeatureReadiness(manifest, "prizeSavings");
    expect(readiness.configured).toBe(false);
    expect(readiness.missing).toEqual(["productionAsset"]);
  });
});

describe("known demo/mock addresses can never enter production configuration", () => {
  it("every known demo/mock/canonical-USDG address hashes to an entry in the shipped hash set", () => {
    expect(KNOWN_DEMO_OR_FORBIDDEN_ADDRESS_HASHES.size).toBe(KNOWN_DEMO_ADDRESSES.length);
    for (const address of KNOWN_DEMO_ADDRESSES) {
      expect(KNOWN_DEMO_OR_FORBIDDEN_ADDRESS_HASHES.has(fnv1aHex(address.toLowerCase()))).toBe(true);
    }
  });

  it("rejects every known demo/mock/canonical-USDG address via sanitizeAddress, regardless of case", () => {
    for (const address of KNOWN_DEMO_ADDRESSES) {
      expect(sanitizeAddress(address)).toBeNull();
      expect(sanitizeAddress(address.toLowerCase())).toBeNull();
      expect(sanitizeAddress(address.toUpperCase().replace("0X", "0x"))).toBeNull();
    }
  });

  it("rejects a manifest that smuggles a known demo address into a production field", () => {
    const demoAddress = KNOWN_DEMO_ADDRESSES[0];
    const manifest = parseProductionManifest({ contracts: { jackToken: demoAddress } });
    expect(manifest.contracts.jackToken).toBeNull();
  });

  it("still accepts an unrelated valid address with the same shape", () => {
    // Sanity check that sanitizeAddress isn't accidentally rejecting everything.
    expect(sanitizeAddress(VALID_A)).toBe(VALID_A);
  });

  it("never appears as a literal string anywhere under src — only its hash does", async () => {
    // Regression guard: application code must hold only hashes of these addresses (see
    // knownDemoAddresses.ts), never the literal strings — otherwise they'd ship verbatim in the
    // client JS bundle and fail scripts/production-output-safety-scan.mjs in CI.
    const { readdirSync, statSync } = await import("node:fs");
    const srcRoot = path.resolve(__dirname, "../src");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = `${dir}/${entry}`;
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry)) continue;
        const content = readFileSync(full, "utf8").toLowerCase();
        for (const address of KNOWN_DEMO_ADDRESSES) {
          if (content.includes(address.toLowerCase())) offenders.push(`${full}: ${address}`);
        }
      }
    };
    walk(srcRoot);
    expect(offenders).toEqual([]);
  });
});

describe("the production resolver never falls back to the mock-only deployment manifest", () => {
  it("imports only deployments/production/4663.json — no import statement for a legacy manifest", () => {
    const resolverPath = path.resolve(__dirname, "../src/lib/production/resolver.ts");
    const source = readFileSync(resolverPath, "utf8");
    const importLines = source.split("\n").filter((line) => /^\s*import\b/.test(line));

    expect(importLines.some((line) => line.includes("deployments/production/4663.json"))).toBe(true);
    expect(importLines.some((line) => /deployments\/4663\.json/.test(line))).toBe(false);
    expect(importLines.some((line) => /deployments\/31337\.json/.test(line))).toBe(false);
    expect(importLines.some((line) => /deployments\/46630\.json/.test(line))).toBe(false);
  });

  it("the whole apps/web source tree never imports the demo deployment resolver or manifests", async () => {
    const { readdirSync, statSync } = await import("node:fs");
    const srcRoot = path.resolve(__dirname, "../src");

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = `${dir}/${entry}`;
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry)) continue;
        const content = readFileSync(full, "utf8");
        // Matches an actual import/require of a legacy manifest — not a documentation mention
        // of one (e.g. knownDemoAddresses.ts legitimately names these files in a comment
        // explaining where its guard list of addresses came from).
        const importsLegacyManifest =
          /(?:from|require)\s*\(?["'][^"']*deployments\/(31337|46630|4663)\.json["']/.test(content);
        if (importsLegacyManifest || content.includes("apps/demo-web") || /from ["']@\/lib\/deployments["']/.test(content)) {
          offenders.push(full);
        }
      }
    };
    walk(srcRoot);

    expect(offenders).toEqual([]);
  });
});
