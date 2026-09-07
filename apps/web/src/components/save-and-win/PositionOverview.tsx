"use client";

import { MetricCard } from "@/components/shared/MetricCard";
import { usePrizeSavingsAssetData } from "@/hooks/usePrizeSavingsData";
import { formatTokenAmount } from "@/lib/format";
import type { Address } from "@/lib/production/resolver";
import { useAccount } from "wagmi";

export function PositionOverview({ productionAsset }: { productionAsset: Address | null }) {
  const { isConnected } = useAccount();
  const { assetDecimals, assetSymbol, walletAssetBalance } = usePrizeSavingsAssetData(productionAsset);

  const walletBalanceLabel =
    productionAsset && isConnected && assetDecimals !== undefined
      ? `${formatTokenAmount(walletAssetBalance, assetDecimals)}${assetSymbol ? ` ${assetSymbol}` : ""}`
      : "—";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <MetricCard label="Deposited principal" value="—" hint="Available at launch" />
      <MetricCard label="Wallet balance" value={walletBalanceLabel} hint={productionAsset ? undefined : "Available at launch"} />
      <MetricCard label="Current prize" value="—" hint="Available at launch" />
      <MetricCard label="Round" value="—" hint="Available at launch" />
      <MetricCard label="Time remaining" value="—" hint="Available at launch" />
      <MetricCard label="Your weight" value="—" hint="Available at launch" />
    </div>
  );
}
