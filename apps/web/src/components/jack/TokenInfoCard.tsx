"use client";

import { AddressDisplay } from "@/components/shared/AddressDisplay";
import { MetricCard } from "@/components/shared/MetricCard";
import { useJackTokenInfo } from "@/hooks/useJackTokenInfo";
import { useWatchAsset } from "@/hooks/useWatchAsset";
import { JACK_LAUNCH_SUPPLY_TARGET } from "@/lib/constants";
import { formatTokenAmount } from "@/lib/format";
import type { Address } from "@/lib/production/resolver";

export function TokenInfoCard({ jackToken, jackTradeUrl }: { jackToken: Address | null; jackTradeUrl: string | null }) {
  const { decimals, symbol, totalSupply } = useJackTokenInfo(jackToken);
  const { watchAsset, status, canWatch } = useWatchAsset();

  const supplyValue =
    jackToken && totalSupply !== undefined && decimals !== undefined
      ? formatTokenAmount(totalSupply, decimals)
      : `${JACK_LAUNCH_SUPPLY_TARGET.toLocaleString("en-US")} (launch target)`;

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">$JACK token</h3>
          <p className="text-sm text-muted">
            {jackToken ? "Live production token." : "Not launched yet — no address to display."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {jackTradeUrl && (
            <a
              href={jackTradeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
            >
              Trade JACK
            </a>
          )}
          {jackToken && canWatch && (
            <button
              type="button"
              onClick={() => watchAsset({ address: jackToken, symbol: symbol ?? "JACK", decimals: decimals ?? 18 })}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-hover"
            >
              {status === "added" ? "Added to wallet" : status === "pending" ? "Confirm in wallet…" : "Add JACK to wallet"}
            </button>
          )}
        </div>
      </div>

      <AddressDisplay address={jackToken} label="Token address" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard label="Total supply" value={supplyValue} />
        <MetricCard label="Symbol" value={jackToken ? symbol ?? "—" : "JACK (planned)"} />
        <MetricCard label="Decimals" value={jackToken ? decimals ?? "—" : "18 (planned)"} />
      </div>
    </div>
  );
}
