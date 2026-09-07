import { describe, expect, it } from "vitest";
import { hasRealWalletConnectProjectId, selectWalletNames } from "@/lib/walletSelection";

describe("hasRealWalletConnectProjectId", () => {
  it("is false for undefined/empty", () => {
    expect(hasRealWalletConnectProjectId(undefined)).toBe(false);
    expect(hasRealWalletConnectProjectId("")).toBe(false);
  });

  it("is true for any non-empty string", () => {
    expect(hasRealWalletConnectProjectId("abc123")).toBe(true);
  });
});

describe("selectWalletNames", () => {
  it("offers only injected/metaMask without a real project ID", () => {
    expect(selectWalletNames(undefined)).toEqual(["injected", "metaMask"]);
    expect(selectWalletNames("")).toEqual(["injected", "metaMask"]);
  });

  it("adds rainbow/walletConnect once a real project ID exists", () => {
    expect(selectWalletNames("real-project-id")).toEqual(["injected", "metaMask", "rainbow", "walletConnect"]);
  });
});
