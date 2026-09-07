"use client";

import { robinhoodChainMainnet } from "@yieldjack/config";
import { useChainId } from "wagmi";

/**
 * Shown next to demo controls (faucets, simulate-yield) that submit a transaction, so a user on
 * the Robinhood Chain mainnet mock-only demo understands the tokens moved are worthless but the
 * ETH paid for gas is not. Renders nothing on testnet/local, where this distinction doesn't
 * apply.
 */
export function GasCostNotice() {
  const chainId = useChainId();
  if (chainId !== robinhoodChainMainnet.id) return null;

  return (
    <p className="text-xs text-danger">
      Uses real ETH for gas on mainnet — mUSDG and mJACK themselves stay worthless demo tokens.
    </p>
  );
}
