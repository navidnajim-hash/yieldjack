"use client";

import { useExplorerBaseUrl, txExplorerUrl, addressExplorerUrl } from "@/hooks/useExplorerUrl";

export function TxExplorerLink({ hash, className }: { hash: string; className?: string }) {
  const base = useExplorerBaseUrl();
  const url = txExplorerUrl(base, hash);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-sm text-primary underline decoration-primary/40 underline-offset-2 hover:text-primary-hover ${className ?? ""}`}
    >
      View on explorer ↗
    </a>
  );
}

export function AddressExplorerLink({ address, className }: { address: string; className?: string }) {
  const base = useExplorerBaseUrl();
  const url = addressExplorerUrl(base, address);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-sm text-primary underline decoration-primary/40 underline-offset-2 hover:text-primary-hover ${className ?? ""}`}
    >
      View on explorer ↗
    </a>
  );
}
