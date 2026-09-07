import { describe, expect, it } from "vitest";
import { hasRealWalletConnectProjectId, selectWalletNames } from "@/lib/walletSelection";

describe("hasRealWalletConnectProjectId", () => {
  it("is false for undefined", () => {
    expect(hasRealWalletConnectProjectId(undefined)).toBe(false);
  });

  it("is false for an empty string", () => {
    expect(hasRealWalletConnectProjectId("")).toBe(false);
  });

  it("is true for a non-empty string", () => {
    expect(hasRealWalletConnectProjectId("abc123")).toBe(true);
  });
});

describe("selectWalletNames", () => {
  it("offers only injected-provider wallets when there is no real project ID", () => {
    expect(selectWalletNames(undefined)).toEqual(["injected", "metaMask"]);
    expect(selectWalletNames("")).toEqual(["injected", "metaMask"]);
  });

  it("never includes rainbow or walletConnect without a real project ID", () => {
    const wallets = selectWalletNames(undefined);
    expect(wallets).not.toContain("rainbow");
    expect(wallets).not.toContain("walletConnect");
  });

  it("includes WalletConnect-dependent wallets once a real project ID is configured", () => {
    const wallets = selectWalletNames("real-project-id");
    expect(wallets).toEqual(["injected", "metaMask", "rainbow", "walletConnect"]);
  });
});
