"use client";

import { addressExplorerUrl, txExplorerUrl, useExplorerBaseUrl } from "@/hooks/useExplorerUrl";
import { shortenAddress } from "@/lib/format";

export function TxExplorerLink({ hash }: { hash: string }) {
  const baseUrl = useExplorerBaseUrl();
  const url = txExplorerUrl(baseUrl, hash);
  if (!url) {
    return <span className="font-mono text-xs text-muted">{shortenAddress(hash)}</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-accent hover:text-accent-hover"
    >
      {shortenAddress(hash)} ↗
    </a>
  );
}

export function AddressExplorerLink({ address, label }: { address: string; label?: string }) {
  const baseUrl = useExplorerBaseUrl();
  const url = addressExplorerUrl(baseUrl, address);
  if (!url) {
    return <span className="font-mono text-xs text-muted">{label ?? shortenAddress(address)}</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-accent hover:text-accent-hover"
    >
      {label ?? shortenAddress(address)} ↗
    </a>
  );
}
