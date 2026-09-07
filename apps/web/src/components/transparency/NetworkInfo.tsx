import { robinhoodChainMainnet } from "@yieldjack/config";
import { MetricCard } from "@/components/shared/MetricCard";

export function NetworkInfo() {
  const rpcUrl = robinhoodChainMainnet.rpcUrls.default.http[0];
  const explorerUrl = robinhoodChainMainnet.blockExplorers?.default.url;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricCard label="Network" value={robinhoodChainMainnet.name} />
      <MetricCard label="Chain ID" value={robinhoodChainMainnet.id} />
      <MetricCard label="Default RPC" value={rpcUrl ? new URL(rpcUrl).hostname : "—"} />
      <MetricCard label="Explorer" value={explorerUrl ? new URL(explorerUrl).hostname : "—"} />
    </div>
  );
}
