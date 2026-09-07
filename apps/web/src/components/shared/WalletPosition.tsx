"use client";

import { useAccount } from "wagmi";
import { shortenAddress } from "@/lib/format";

export function WalletPositionBar() {
  const { address, isConnected } = useAccount();

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
      <span className="text-sm text-muted">Wallet</span>
      <span className="font-mono text-sm text-foreground">
        {isConnected && address ? shortenAddress(address) : "Not connected"}
      </span>
    </div>
  );
}
