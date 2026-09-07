"use client";

import { robinhoodChainMainnet } from "@yieldjack/config";
import type { ReactNode } from "react";
import { useAccount, useSwitchChain } from "wagmi";

/**
 * Wraps app content that requires the wallet to be connected to Robinhood Chain mainnet — the
 * only chain this production app ever sends a transaction to. Shows a connect prompt when
 * disconnected, or a one-click network switch when connected to any other chain.
 */
export function NetworkGuard({ children }: { children: ReactNode }) {
  const { isConnected, chain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-foreground">Connect your wallet to continue.</p>
        <p className="mt-1 text-sm text-muted">Use the Connect Wallet button in the top navigation.</p>
      </div>
    );
  }

  if (chain?.id !== robinhoodChainMainnet.id) {
    return (
      <div className="rounded-xl border border-warning/40 bg-warning/10 p-8 text-center">
        <p className="text-foreground">
          Wrong network{chain ? ` (${chain.name})` : ""}. YieldJack runs on {robinhoodChainMainnet.name}.
        </p>
        <button
          type="button"
          onClick={() => switchChain({ chainId: robinhoodChainMainnet.id })}
          disabled={isPending}
          className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {isPending ? "Switching…" : `Switch to ${robinhoodChainMainnet.name}`}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
