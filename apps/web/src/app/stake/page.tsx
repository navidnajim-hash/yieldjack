import { PageSection, PageShell } from "@/components/shared/PageShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { StakeClient } from "./StakeClient";

export const metadata = {
  title: "Stake JACK | YieldJack",
  description: "Stake $JACK to earn a share of YieldJack's creator-fee revenue, streamed in WETH.",
};

export default function StakeJackPage() {
  return (
    <PageShell>
      <PageSection className="flex flex-col gap-8">
        <SectionHeader
          eyebrow="Stake JACK"
          title="Stake JACK, earn WETH"
          description="Stake real $JACK to earn a share of YieldJack's creator-fee revenue, streamed in WETH over a rolling seven-day window."
        />
        <StakeClient />
      </PageSection>
    </PageShell>
  );
}
