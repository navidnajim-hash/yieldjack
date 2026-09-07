import Link from "next/link";
import { RevenueSplit } from "@/components/shared/RevenueSplit";
import { SectionHeader } from "@/components/shared/SectionHeader";

export function JackUtilityExplainer() {
  return (
    <div className="flex flex-col gap-10">
      <SectionHeader
        eyebrow="$JACK"
        title="JACK ties trading activity to real, streamed rewards"
        description="Stake JACK to earn a share of YieldJack's creator-fee revenue in WETH — routed on-chain through a permissionless fee router, never a promise."
      />
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <RevenueSplit />
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Every $JACK trade that generates creator-fee revenue routes it to <code className="font-mono text-foreground">JackFeeRouter</code>.
            Anyone can permissionlessly call its harvest function, which wraps received ETH to WETH and
            splits it 70/20/10 between stakers, the prize reserve, and operations.
          </p>
          <Link href="/jack" className="text-sm font-semibold text-accent hover:text-accent-hover">
            Explore JACK utility →
          </Link>
        </div>
      </div>
    </div>
  );
}
