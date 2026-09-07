"use client";

import { useState } from "react";
import { AddressExplorerLink } from "./ExplorerLink";
import { shortenAddress } from "@/lib/format";

export function AddressDisplay({ address, label }: { address: string | null; label: string }) {
  const [copied, setCopied] = useState(false);

  if (!address) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
        <span className="text-sm text-muted">{label}</span>
        <span className="font-mono text-xs text-muted-dim">Not deployed</span>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser; silently ignored, address stays visible.
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <AddressExplorerLink address={address} label={shortenAddress(address)} />
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label} address`}
          className="rounded px-1.5 py-0.5 text-xs text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
