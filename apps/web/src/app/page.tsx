import { CreatorRevenueFlow } from "@/components/home/CreatorRevenueFlow";
import { CurrentRoundPreview } from "@/components/home/CurrentRoundPreview";
import { FinalCta } from "@/components/home/FinalCta";
import { Hero } from "@/components/home/Hero";
import { JackUtilityExplainer } from "@/components/home/JackUtilityExplainer";
import { RecentDraws } from "@/components/home/RecentDraws";
import { SaveWinExplainer } from "@/components/home/SaveWinExplainer";
import { ThreeStepLifecycle } from "@/components/home/ThreeStepLifecycle";
import { TransparencySection } from "@/components/home/TransparencySection";
import { PageSection, PageShell } from "@/components/shared/PageShell";

export default function HomePage() {
  return (
    <PageShell>
      <Hero />
      <PageSection className="border-t border-border">
        <SaveWinExplainer />
      </PageSection>
      <PageSection className="border-t border-border">
        <JackUtilityExplainer />
      </PageSection>
      <PageSection className="border-t border-border">
        <ThreeStepLifecycle />
      </PageSection>
      <PageSection className="border-t border-border">
        <CreatorRevenueFlow />
      </PageSection>
      <PageSection className="border-t border-border">
        <CurrentRoundPreview />
      </PageSection>
      <PageSection className="border-t border-border">
        <RecentDraws />
      </PageSection>
      <PageSection className="border-t border-border">
        <TransparencySection />
      </PageSection>
      <PageSection className="border-t border-border">
        <FinalCta />
      </PageSection>
    </PageShell>
  );
}
