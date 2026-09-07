import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const useAccountMock = vi.fn();
const switchChainMock = vi.fn();

vi.mock("wagmi", () => ({
  useAccount: () => useAccountMock(),
  useSwitchChain: () => ({ switchChain: switchChainMock, isPending: false }),
}));

vi.mock("@yieldjack/config", () => ({
  robinhoodChainMainnet: { id: 4663, name: "Robinhood Chain" },
}));

import { NetworkGuard } from "@/components/shared/NetworkGuard";

describe("NetworkGuard", () => {
  beforeEach(() => {
    useAccountMock.mockReset();
    switchChainMock.mockReset();
  });

  it("prompts to connect when the wallet is disconnected", () => {
    useAccountMock.mockReturnValue({ isConnected: false, chain: undefined });
    render(
      <NetworkGuard>
        <p>Protected content</p>
      </NetworkGuard>,
    );

    expect(screen.getByText(/connect your wallet to continue/i)).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("prompts to switch networks when connected to the wrong chain", () => {
    useAccountMock.mockReturnValue({ isConnected: true, chain: { id: 1, name: "Ethereum" } });
    render(
      <NetworkGuard>
        <p>Protected content</p>
      </NetworkGuard>,
    );

    expect(screen.getByText(/wrong network/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch to robinhood chain/i })).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders children when connected to the correct chain", () => {
    useAccountMock.mockReturnValue({ isConnected: true, chain: { id: 4663, name: "Robinhood Chain" } });
    render(
      <NetworkGuard>
        <p>Protected content</p>
      </NetworkGuard>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
