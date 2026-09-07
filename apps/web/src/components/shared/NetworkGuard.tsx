"use client";

import { robinhoodChainTestnet } from "@yieldjack/config";
import type { ReactNode } from "react";
import { useAccount, useSwitchChain } from "wagmi";

/**
 * Wraps app content that requires a supported chain. Shows a wallet-connect prompt when
 * disconnected, or a one-click network switch when connected to an unsupported chain.
 */
export function NetworkGuard({ children }: { children: ReactNode }) {
  const { isConnected, chain } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-foreground">Connect your wallet to use the YieldJack app.</p>
        <p className="mt-1 text-sm text-muted">
          Use the Connect Wallet button in the top navigation.
        </p>
      </div>
    );
  }

  const supported = chain?.id === robinhoodChainTestnet.id || chain?.testnet;

  if (!supported || !chain) {
    return (
      <div className="rounded-xl border border-gold/40 bg-gold/10 p-6 text-center">
        <p className="text-foreground">
          Wrong network{chain ? ` (${chain.name})` : ""}. YieldJack runs on{" "}
          {robinhoodChainTestnet.name}.
        </p>
        <button
          type="button"
          onClick={() => switchChain({ chainId: robinhoodChainTestnet.id })}
          disabled={isPending}
          className="mt-3 rounded-md bg-gold px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-gold-hover disabled:opacity-60"
        >
          {isPending ? "Switching…" : `Switch to ${robinhoodChainTestnet.name}`}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
