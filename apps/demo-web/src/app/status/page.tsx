"use client";

import { robinhoodChainTestnet } from "@yieldjack/config";
import { useAccount, useBlockNumber, useChainId } from "wagmi";
import { getDeploymentManifest } from "@/lib/deployments";

export default function StatusPage() {
  const chainId = useChainId();
  const { chain } = useAccount();
  const manifest = getDeploymentManifest(chainId);
  const blockNumber = useBlockNumber({ watch: true, chainId: robinhoodChainTestnet.id });

  const rpcHealthy = blockNumber.isSuccess && !blockNumber.isError;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Testnet status</h1>
        <p className="mt-1 text-sm text-muted">Robinhood Chain Testnet, read live via RPC.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatusRow label="Network" value={robinhoodChainTestnet.name} />
        <StatusRow label="Chain ID" value={String(robinhoodChainTestnet.id)} />
        <StatusRow label="RPC" value={robinhoodChainTestnet.rpcUrls.default.http[0] ?? "—"} mono />
        <StatusRow
          label="Explorer"
          value={robinhoodChainTestnet.blockExplorers?.default.url ?? "—"}
          mono
        />
        <StatusRow
          label="Latest block"
          value={blockNumber.data !== undefined ? blockNumber.data.toString() : "—"}
        />
        <StatusRow
          label="RPC status"
          value={
            <span className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${rpcHealthy ? "bg-primary" : "bg-danger"}`}
                aria-hidden="true"
              />
              {rpcHealthy ? "Reachable" : blockNumber.isLoading ? "Checking…" : "Unreachable"}
            </span>
          }
        />
        <StatusRow label="Your wallet's network" value={chain?.name ?? "Not connected"} />
        <StatusRow
          label="Contracts deployed"
          value={manifest?.deployedAt ? "Yes" : "Not yet on this network"}
        />
      </div>
    </div>
  );
}

function StatusRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-sm text-foreground ${mono ? "break-all font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}
