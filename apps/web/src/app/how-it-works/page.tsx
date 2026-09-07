import Link from "next/link";
import { PageSection, PageShell } from "@/components/shared/PageShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { PrelaunchNotice } from "@/components/shared/PrelaunchNotice";

export const metadata = {
  title: "How It Works | YieldJack",
  description: "How YieldJack's Save & Win prize savings and $JACK staking mechanics work, end to end.",
};

const SAVE_WIN_STEPS = [
  "Users deposit the supported production savings asset into the vault.",
  "The vault routes deposits into a future verified yield source.",
  "Principal accounting and prize accounting are kept strictly separate — a prize can only ever be funded by realized yield.",
  "Eligible users automatically participate in recurring draws while their funds are deposited.",
  "Users can withdraw their tracked principal according to the production contracts, at any time the contracts allow.",
];

const JACK_STEPS = [
  "JACK is traded through its configured venue.",
  "Applicable creator-fee revenue accrues in a shared fee escrow.",
  "Anyone may permissionlessly call JackFeeRouter's harvest() function — there is no privileged caller.",
  "The router wraps received native ETH into WETH before distributing anything.",
  "70% of each harvest routes to JackStakingRewards.",
  "20% routes to the prize reserve.",
  "10% routes to operations and security.",
  "Staking rewards stream linearly over a rolling seven-day window, not as an instant lump sum.",
];

export default function HowItWorksPage() {
  return (
    <PageShell>
      <PageSection className="flex flex-col gap-14">
        <SectionHeader
          eyebrow="How it works"
          title="How YieldJack works"
          description="Two mechanics, both fully on-chain: prize savings, and $JACK's creator-fee revenue share."
        />

        <div className="flex flex-col gap-5">
          <h3 className="text-xl font-semibold text-foreground">A. Save & Win</h3>
          <PrelaunchNotice>
            The production savings vault is not yet deployed. The steps below describe how it will work once it
            is — nothing here is presented as already live.
          </PrelaunchNotice>
          <ol className="flex flex-col gap-3">
            {SAVE_WIN_STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
                <span className="font-mono text-sm text-accent">{index + 1}</span>
                <span className="text-sm text-muted">{step}</span>
              </li>
            ))}
          </ol>
          <Link href="/app" className="self-start text-sm font-semibold text-accent hover:text-accent-hover">
            Open Save & Win →
          </Link>
        </div>

        <div className="flex flex-col gap-5">
          <h3 className="text-xl font-semibold text-foreground">B. $JACK</h3>
          <ol className="flex flex-col gap-3">
            {JACK_STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
                <span className="font-mono text-sm text-accent">{index + 1}</span>
                <span className="text-sm text-muted">{step}</span>
              </li>
            ))}
          </ol>
          <Link href="/stake" className="self-start text-sm font-semibold text-accent hover:text-accent-hover">
            Open Stake JACK →
          </Link>
        </div>
      </PageSection>
    </PageShell>
  );
}
