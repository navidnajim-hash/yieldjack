import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { robinhoodChainMainnet, robinhoodChainTestnet } from "@yieldjack/config";
import { MAINNET_DEMO_WARNING, MainnetDemoBanner } from "@/components/shared/MainnetDemoBanner";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const useChainIdMock = vi.fn();
vi.mock("wagmi", () => ({
  useChainId: () => useChainIdMock(),
}));

describe("MainnetDemoBanner", () => {
  afterEach(() => {
    useChainIdMock.mockReset();
  });

  it("shows the exact required warning while connected to Robinhood Chain mainnet", () => {
    useChainIdMock.mockReturnValue(robinhoodChainMainnet.id);
    render(<MainnetDemoBanner />);
    expect(screen.getByRole("alert")).toHaveTextContent(MAINNET_DEMO_WARNING);
  });

  it("mentions both mock tokens by their mUSDG/mJACK symbols, never bare USDG or JACK", () => {
    expect(MAINNET_DEMO_WARNING).toContain("mUSDG");
    expect(MAINNET_DEMO_WARNING).toContain("mJACK");
    expect(MAINNET_DEMO_WARNING).not.toMatch(/(?<!m)USDG/);
    expect(MAINNET_DEMO_WARNING).not.toMatch(/(?<!m)JACK/);
  });

  it("renders nothing on testnet", () => {
    useChainIdMock.mockReturnValue(robinhoodChainTestnet.id);
    const { container } = render(<MainnetDemoBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the chain is unknown/disconnected", () => {
    useChainIdMock.mockReturnValue(undefined);
    const { container } = render(<MainnetDemoBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("root layout wiring", () => {
  it("mounts MainnetDemoBanner unconditionally, so no individual page can drop it by omission", () => {
    const layoutSource = readFileSync(path.resolve(__dirname, "../src/app/layout.tsx"), "utf8");
    expect(layoutSource).toContain('from "@/components/shared/MainnetDemoBanner"');
    // Must be rendered directly in the JSX tree, not merely imported.
    expect(layoutSource).toMatch(/<MainnetDemoBanner\s*\/>/);
  });
});
