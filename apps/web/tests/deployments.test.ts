import { describe, expect, it } from "vitest";
import { ANVIL_CHAIN_ID, robinhoodChainMainnet, robinhoodChainTestnet } from "@yieldjack/config";
import { getDeploymentManifest } from "@/lib/deployments";

describe("getDeploymentManifest", () => {
  it("resolves deployments/4663.json for the Robinhood Chain mainnet demo", () => {
    const manifest = getDeploymentManifest(robinhoodChainMainnet.id);
    expect(manifest).toBeDefined();
    expect(manifest?.chainId).toBe(4663);
    expect(manifest?.name).toBe("robinhood-chain-mainnet-demo");
    // An empty placeholder until a real (human-run, --broadcast) deploy happens.
    expect(manifest?.deployedAt).toBeNull();
  });

  it("still resolves the existing testnet and local manifests unchanged", () => {
    expect(getDeploymentManifest(robinhoodChainTestnet.id)?.chainId).toBe(46630);
    expect(getDeploymentManifest(ANVIL_CHAIN_ID)?.chainId).toBe(31337);
  });

  it("returns undefined for an unrecognized chain id", () => {
    expect(getDeploymentManifest(999_999)).toBeUndefined();
  });
});
