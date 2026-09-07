import { describe, expect, it } from "vitest";
import { parseProductionManifest, sanitizeAddress } from "@/lib/production/manifest";

const VALID = "0x1234567890123456789012345678901234567890";
const ZERO = `0x${"0".repeat(40)}`;

describe("sanitizeAddress", () => {
  it("accepts a well-formed non-zero address", () => {
    expect(sanitizeAddress(VALID)).toBe(VALID);
  });

  it("rejects null and undefined", () => {
    expect(sanitizeAddress(null)).toBeNull();
    expect(sanitizeAddress(undefined)).toBeNull();
  });

  it("rejects the zero address", () => {
    expect(sanitizeAddress(ZERO)).toBeNull();
  });

  it("rejects malformed addresses", () => {
    expect(sanitizeAddress("not-an-address")).toBeNull();
    expect(sanitizeAddress("0x123")).toBeNull(); // too short
    expect(sanitizeAddress(`${VALID}ff`)).toBeNull(); // too long
    expect(sanitizeAddress("1234567890123456789012345678901234567890")).toBeNull(); // missing 0x
    expect(sanitizeAddress(`0x${"g".repeat(40)}`)).toBeNull(); // non-hex characters
    expect(sanitizeAddress(42)).toBeNull(); // wrong type
    expect(sanitizeAddress({})).toBeNull(); // wrong type
  });
});

describe("parseProductionManifest", () => {
  it("resolves every contract field to null for an empty/malformed manifest", () => {
    const manifest = parseProductionManifest({});
    expect(manifest.status).toBe("prelaunch");
    expect(manifest.environment).toBe("production");
    for (const value of Object.values(manifest.contracts)) {
      expect(value).toBeNull();
    }
  });

  it("never throws on garbage input", () => {
    expect(() => parseProductionManifest(null)).not.toThrow();
    expect(() => parseProductionManifest(undefined)).not.toThrow();
    expect(() => parseProductionManifest("a string")).not.toThrow();
    expect(() => parseProductionManifest(42)).not.toThrow();
    expect(() => parseProductionManifest([1, 2, 3])).not.toThrow();
  });

  it("accepts a fully valid manifest", () => {
    const manifest = parseProductionManifest({
      chainId: 4663,
      network: "robinhood-chain-mainnet",
      status: "live",
      updatedAt: "2026-01-01T00:00:00.000Z",
      contracts: {
        jackToken: VALID,
        jackFeeRouter: VALID,
        jackStakingRewards: VALID,
        prizeReserve: VALID,
        productionVault: VALID,
        productionPrizeEngine: VALID,
        productionAsset: VALID,
      },
      links: { jackTradeUrl: "https://example.com/trade" },
      deploymentBlock: 123,
    });

    expect(manifest.status).toBe("live");
    expect(manifest.contracts.jackToken).toBe(VALID);
    expect(manifest.links.jackTradeUrl).toBe("https://example.com/trade");
    expect(manifest.deploymentBlock).toBe(123);
  });

  it("rejects a non-https jackTradeUrl", () => {
    const manifest = parseProductionManifest({ links: { jackTradeUrl: "http://example.com" } });
    expect(manifest.links.jackTradeUrl).toBeNull();
  });

  it("defaults status to prelaunch for any value other than the literal 'live'", () => {
    expect(parseProductionManifest({ status: "LIVE" }).status).toBe("prelaunch");
    expect(parseProductionManifest({ status: "anything" }).status).toBe("prelaunch");
  });
});
