"use client";

import type { TxPhase } from "@/hooks/useTxState";
import { TxExplorerLink } from "./ExplorerLink";

export function TxStatus({ phase, hash, errorMessage }: { phase: TxPhase; hash?: string; errorMessage?: string }) {
  if (phase === "idle") return null;

  if (phase === "signing") {
    return <p className="text-sm text-muted">Confirm the transaction in your wallet…</p>;
  }

  if (phase === "confirming") {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm text-gold">Waiting for confirmation…</p>
        {hash && <TxExplorerLink hash={hash} />}
      </div>
    );
  }

  if (phase === "success") {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm text-primary">Confirmed ✓</p>
        {hash && <TxExplorerLink hash={hash} />}
      </div>
    );
  }

  return (
    <p role="alert" className="text-sm text-danger">
      {errorMessage ?? "Transaction failed."}
    </p>
  );
}
