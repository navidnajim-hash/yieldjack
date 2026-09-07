import Link from "next/link";
import { TokenInfoCard } from "@/components/jack/TokenInfoCard";
import { PageSection, PageShell } from "@/components/shared/PageShell";
import { RevenueSplit } from "@/components/shared/RevenueSplit";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { productionManifest } from "@/lib/production/resolver";

export const metadata = {
  title: "JACK | YieldJack",
  description: "JACK is YieldJack's ecosystem utility token — stake it to earn a share of creator-fee revenue.",
};

const UTILITY_POINTS = [
  {
    title: "Stake for a revenue share",
    body: "Stake JACK in JackStakingRewards to earn a share of YieldJack's creator-fee revenue, paid in WETH and streamed over a rolling seven-day window.",
  },
  {
    title: "Revenue, not a promise",
    body: "Rewards come from a permissionless on-chain harvest of real creator fees — not from token emissions or a fixed yield schedule.",
  },
  {
    title: "Future sponsorship & burn mechanics",
    body: "JACK is designed to plug into compatible production sponsorship and burn mechanics as YieldJack's prize-savings product matures — details land here once those are live.",
  },
];

export default function JackPage() {
  const { jackToken } = productionManifest.contracts;
  const jackTradeUrl = productionManifest.links.jackTradeUrl;

  return (
    <PageShell>
      <PageSection className="flex flex-col gap-10">
        <SectionHeader
          eyebrow="$JACK"
          title="JACK is YieldJack's ecosystem utility token"
          description={
            <>
              JACK is not affiliated with, and should never be confused with,{" "}
              <span className="font-mono text-muted-dim">mJACK</span> — the worthless mock token used only by
              YieldJack&apos;s separate testnet/demo application.
            </>
          }
        />

        <TokenInfoCard jackToken={jackToken} jackTradeUrl={jackTradeUrl} />

        <div className="grid gap-6 sm:grid-cols-3">
          {UTILITY_POINTS.map((point) => (
            <div key={point.title} className="rounded-xl border border-border bg-surface p-5">
              <h3 className="text-base font-semibold text-foreground">{point.title}</h3>
              <p className="mt-2 text-sm text-muted">{point.body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-foreground">Creator-fee revenue split</h3>
          <p className="mt-1 text-sm text-muted">Every harvest from JackFeeRouter splits three ways.</p>
          <div className="mt-6">
            <RevenueSplit />
          </div>
        </div>

        <p className="text-sm text-muted">
          Not every JACK trade produces staker rewards — a harvest only distributes revenue that has actually
          accrued in the fee escrow at the time it&apos;s called. See{" "}
          <Link href="/how-it-works" className="text-accent hover:text-accent-hover">
            How It Works
          </Link>{" "}
          for the full mechanics.
        </p>
      </PageSection>
    </PageShell>
  );
}
