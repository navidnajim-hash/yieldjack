import { SectionHeader } from "@/components/shared/SectionHeader";

const FLOW = [
  { label: "JACK trades", detail: "Creator fees accrue in pons V2's fee escrow" },
  { label: "harvest()", detail: "Permissionless — anyone can call it, any time" },
  { label: "Wrap to WETH", detail: "Native ETH is wrapped before any transfer" },
  { label: "70 / 20 / 10 split", detail: "Stakers · prize reserve · operations" },
];

export function CreatorRevenueFlow() {
  return (
    <div className="flex flex-col gap-10">
      <SectionHeader
        eyebrow="Creator revenue"
        title="From a JACK trade to a staking reward"
        description="No off-chain promise — the flow from trading activity to a staker's claimable WETH happens entirely through permissionless, on-chain calls."
      />
      <div className="grid gap-4 sm:grid-cols-4">
        {FLOW.map((item, index) => (
          <div key={item.label} className="relative flex flex-col gap-2 rounded-xl border border-border bg-surface p-5">
            <span className="font-mono text-xs text-muted-dim">Step {index + 1}</span>
            <h3 className="font-mono text-sm font-semibold text-accent">{item.label}</h3>
            <p className="text-xs text-muted">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
