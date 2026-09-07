import { describe, expect, it } from "vitest";
import {
  ANVIL_CHAIN_ID,
  CONTRACT_NAMES,
  isFullyDeployed,
  robinhoodChainMainnet,
  robinhoodChainTestnet,
} from "@yieldjack/config";
import { getDeploymentManifest } from "@/lib/deployments";

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const ZERO_ADDRESS = `0x${"0".repeat(40)}`;

describe("getDeploymentManifest", () => {
  it("resolves the completed mainnet-demo deployment from deployments/4663.json", () => {
    const manifest = getDeploymentManifest(robinhoodChainMainnet.id);
    expect(manifest).toBeDefined();
    expect(manifest?.chainId).toBe(4663);
    expect(manifest?.name).toBe("robinhood-chain-mainnet-demo");

    // A valid, non-null ISO timestamp — never hardcoded, just checked for shape by
    // round-tripping through Date and confirming it re-serializes identically.
    expect(manifest?.deployedAt).not.toBeNull();
    const deployedAt = manifest!.deployedAt!;
    expect(new Date(deployedAt).toISOString()).toBe(deployedAt);

    for (const name of CONTRACT_NAMES) {
      const entry = manifest!.contracts[name];
      expect(entry.address).toMatch(ADDRESS_PATTERN);
      expect(entry.address?.toLowerCase()).not.toBe(ZERO_ADDRESS);
      expect(Number.isInteger(entry.blockNumber)).toBe(true);
      expect(entry.blockNumber!).toBeGreaterThan(0);
    }

    expect(isFullyDeployed(manifest!)).toBe(true);
  });

  it("still resolves the existing testnet and local manifests unchanged", () => {
    expect(getDeploymentManifest(robinhoodChainTestnet.id)?.chainId).toBe(46630);
    expect(getDeploymentManifest(ANVIL_CHAIN_ID)?.chainId).toBe(31337);
  });

  it("returns undefined for an unrecognized chain id", () => {
    expect(getDeploymentManifest(999_999)).toBeUndefined();
  });
});
