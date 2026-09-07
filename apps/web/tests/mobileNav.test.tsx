import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("wagmi", () => ({ useAccount: () => ({ isConnected: false, chain: undefined }) }));
vi.mock("@yieldjack/config", () => ({
  robinhoodChainMainnet: { id: 4663, name: "Robinhood Chain", blockExplorers: undefined },
}));
vi.mock("@rainbow-me/rainbowkit", () => ({
  ConnectButton: () => <button type="button">Connect Wallet</button>,
}));

import { Header } from "@/components/layout/Header";

describe("mobile navigation", () => {
  it("is closed by default and opens the menu on toggle", () => {
    render(<Header />);

    const toggle = screen.getByRole("button", { name: /open navigation menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: /mobile navigation/i })).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: /close navigation menu/i })).toHaveAttribute("aria-expanded", "true");
    const mobileNav = screen.getByRole("navigation", { name: /mobile navigation/i });
    expect(mobileNav).toBeInTheDocument();
    expect(mobileNav.querySelectorAll("a").length).toBeGreaterThanOrEqual(7);
  });

  it("closes when Escape is pressed", () => {
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("navigation", { name: /mobile navigation/i })).not.toBeInTheDocument();
  });

  it("closes again when toggled a second time", () => {
    render(<Header />);
    const toggle = screen.getByRole("button", { name: /open navigation menu/i });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: /close navigation menu/i }));

    expect(screen.queryByRole("navigation", { name: /mobile navigation/i })).not.toBeInTheDocument();
  });
});
