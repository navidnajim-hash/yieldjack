import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { X_URL } from "@/lib/constants";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("wagmi", () => ({ useAccount: () => ({ isConnected: false, chain: undefined }) }));
vi.mock("@yieldjack/config", () => ({
  robinhoodChainMainnet: {
    id: 4663,
    name: "Robinhood Chain",
    blockExplorers: { default: { url: "https://explorer.robinhood.example" } },
  },
}));
vi.mock("@rainbow-me/rainbowkit", () => ({
  ConnectButton: () => <button type="button">Connect Wallet</button>,
}));

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { XLink } from "@/components/shared/XIcon";

describe("X links", () => {
  it("the shared constant points exactly to https://x.com/YieldJack", () => {
    expect(X_URL).toBe("https://x.com/YieldJack");
  });

  it("XLink opens the exact URL safely in a new tab", () => {
    render(<XLink />);
    const link = screen.getByRole("link", { name: /yieldjack on x/i });
    expect(link).toHaveAttribute("href", "https://x.com/YieldJack");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });

  it("the header links to the exact X URL", () => {
    render(<Header />);
    const link = screen.getByRole("link", { name: /yieldjack on x/i });
    expect(link).toHaveAttribute("href", "https://x.com/YieldJack");
  });

  it("the footer links to the exact X URL", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /x \/ twitter/i });
    expect(link).toHaveAttribute("href", "https://x.com/YieldJack");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});
