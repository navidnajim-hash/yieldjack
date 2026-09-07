"use client";

import { useAccount } from "wagmi";
import { AddressPill } from "@/components/shared/AddressPill";

export function WalletStatusBar() {
  const { address, chain, isConnected } = useAccount();

  if (!isConnected || !address) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
      <span className="flex items-center gap-1.5 text-muted">
        <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
        Connected
      </span>
      <AddressPill address={address} />
      <span className="text-muted">
        Network: <span className="text-foreground">{chain?.name ?? "Unknown"}</span>
      </span>
    </div>
  );
}
