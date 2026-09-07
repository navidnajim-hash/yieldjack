"use client";

import type { TxPhase } from "@/hooks/useTxState";
import { TxExplorerLink } from "./ExplorerLink";

/** Announces transaction status changes to assistive technology via `aria-live`, and shows an
 *  explorer link once a hash exists. */
export function TxStatus({ phase, hash, errorMessage }: { phase: TxPhase; hash?: string; errorMessage?: string }) {
  if (phase === "idle") return null;

  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-1">
      {phase === "signing" && <p className="text-sm text-muted">Confirm the transaction in your wallet…</p>}
      {phase === "confirming" && (
        <>
          <p className="text-sm text-warning">Waiting for confirmation…</p>
          {hash && <TxExplorerLink hash={hash} />}
        </>
      )}
      {phase === "success" && (
        <>
          <p className="text-sm text-accent">Confirmed</p>
          {hash && <TxExplorerLink hash={hash} />}
        </>
      )}
      {phase === "error" && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage ?? "Transaction failed."}
        </p>
      )}
    </div>
  );
}
