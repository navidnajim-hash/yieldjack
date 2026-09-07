"use client";

import { useState } from "react";
import { shortenAddress } from "@/lib/format";

export function AddressPill({ address, className }: { address: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser; failing silently is acceptable here —
      // the address is still visible to copy manually.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-foreground transition-colors hover:border-border-strong ${className ?? ""}`}
      title={address}
      aria-label={`Copy address ${address}`}
    >
      {shortenAddress(address)}
      <span aria-hidden="true" className="text-muted">
        {copied ? "✓" : "⧉"}
      </span>
    </button>
  );
}
