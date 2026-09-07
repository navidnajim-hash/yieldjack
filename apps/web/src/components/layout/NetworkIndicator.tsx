"use client";

import { robinhoodChainMainnet } from "@yieldjack/config";
import { useAccount } from "wagmi";

/** Small always-visible pill showing which chain the connected wallet (if any) is on. Distinct
 *  from `NetworkGuard`, which blocks page content — this is passive, header-level context. */
export function NetworkIndicator() {
  const { chain, isConnected } = useAccount();

  const onCorrectChain = isConnected && chain?.id === robinhoodChainMainnet.id;
  const label = !isConnected ? "Robinhood Chain" : onCorrectChain ? chain.name : `Wrong network: ${chain?.name ?? "unknown"}`;

  return (
    <span
      className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs sm:inline-flex ${
        !isConnected
          ? "border-border text-muted"
          : onCorrectChain
            ? "border-accent/40 text-accent"
            : "border-warning/50 text-warning"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          !isConnected ? "bg-muted-dim" : onCorrectChain ? "bg-accent" : "bg-warning"
        }`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
