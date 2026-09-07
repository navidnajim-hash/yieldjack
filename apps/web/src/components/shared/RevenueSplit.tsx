import { DOCUMENTED_REVENUE_SPLIT_BPS, REVENUE_SPLIT_CLARIFICATION } from "@/lib/constants";
import { formatBps } from "@/lib/format";

export interface RevenueSplitValues {
  stakers: number;
  prizeReserve: number;
  operations: number;
}

const SEGMENTS: { key: keyof RevenueSplitValues; label: string; description: string; color: string }[] = [
  { key: "stakers", label: "JACK stakers", description: "Streamed as WETH over 7 days", color: "bg-accent" },
  { key: "prizeReserve", label: "Prize reserve", description: "Tops up YieldJack's recurring prizes", color: "bg-foreground/70" },
  { key: "operations", label: "Operations & security", description: "Infrastructure and safety work", color: "bg-muted-dim" },
];

/**
 * Renders the JackFeeRouter creator-fee revenue split. Defaults to the documented immutable
 * split from the contract source (`DOCUMENTED_REVENUE_SPLIT_BPS`); pass `values` to show the
 * live on-chain split once `jackFeeRouter` is configured and readable.
 */
export function RevenueSplit({ values, isLive = false }: { values?: RevenueSplitValues; isLive?: boolean }) {
  const split = values ?? DOCUMENTED_REVENUE_SPLIT_BPS;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex h-3 w-full overflow-hidden rounded-full border border-border">
        {SEGMENTS.map((segment) => (
          <div key={segment.key} className={segment.color} style={{ width: `${split[segment.key] / 100}%` }} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {SEGMENTS.map((segment) => (
          <div key={segment.key} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${segment.color}`} aria-hidden="true" />
              <span className="font-mono text-lg font-semibold text-foreground">{formatBps(split[segment.key])}</span>
            </div>
            <p className="text-sm font-medium text-foreground">{segment.label}</p>
            <p className="text-xs text-muted">{segment.description}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-dim">
        {isLive ? "Live values read from JackFeeRouter." : "Documented split from JackFeeRouter's immutable constructor parameters — shown ahead of deployment."}{" "}
        {REVENUE_SPLIT_CLARIFICATION}
      </p>
    </div>
  );
}
