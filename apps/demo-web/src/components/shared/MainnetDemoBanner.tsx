"use client";

import { robinhoodChainMainnet } from "@yieldjack/config";
import { useChainId } from "wagmi";

export const MAINNET_DEMO_WARNING =
  "MAINNET DEMO — mUSDG and mJACK are unlimited mock tokens with no value. Yield is simulated. Randomness is insecure. Do not purchase these tokens or send real assets.";

/**
 * Mounted once in the root layout (see app/layout.tsx) so it renders on every page without any
 * page needing to remember to import it — the warning can't be dropped by a page-level edit.
 * Only visible while the connected chain is the Robinhood Chain mainnet mock-only demo (chain id
 * 4663); see CLAUDE.md and docs/PRODUCTION_ROADMAP.md for why no real-value deployment exists.
 */
export function MainnetDemoBanner() {
  const chainId = useChainId();
  if (chainId !== robinhoodChainMainnet.id) return null;

  return (
    <div role="alert" className="border-b border-danger bg-danger px-4 py-3 text-center sm:px-6">
      <p className="text-sm font-semibold text-white">{MAINNET_DEMO_WARNING}</p>
    </div>
  );
}
