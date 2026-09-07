import { Hero } from "@/components/landing/Hero";
import { LiveStats } from "@/components/landing/LiveStats";
import { RecentWinnerPanel } from "@/components/landing/RecentWinnerPanel";
import { RiskNotice } from "@/components/landing/RiskNotice";
import { SponsorExplainer } from "@/components/landing/SponsorExplainer";
import { ThreeSteps } from "@/components/landing/ThreeSteps";

export default function HomePage() {
  return (
    <div>
      <Hero />
      <ThreeSteps />
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <LiveStats />
      </section>
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 pb-16 sm:px-6 md:grid-cols-2">
        <RecentWinnerPanel />
        <SponsorExplainer />
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <RiskNotice />
      </section>
    </div>
  );
}
