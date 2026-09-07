import { ClaimPanel } from "@/components/save-and-win/ClaimPanel";
import { DepositForm } from "@/components/save-and-win/DepositForm";
import { PositionOverview } from "@/components/save-and-win/PositionOverview";
import { RecentActivity } from "@/components/save-and-win/RecentActivity";
import { RoundTimeline } from "@/components/save-and-win/RoundTimeline";
import { WithdrawForm } from "@/components/save-and-win/WithdrawForm";
import { NetworkGuard } from "@/components/shared/NetworkGuard";
import { PageSection, PageShell } from "@/components/shared/PageShell";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { WalletPositionBar } from "@/components/shared/WalletPosition";
import { prizeSavingsReadiness, productionManifest } from "@/lib/production/resolver";

// This page never imports the demo deployment resolver or deployments/4663.json — see
// docs in src/lib/production/resolver.ts. `productionVault` and `productionPrizeEngine` are
// null until a real, audited vault and prize engine are deployed, so every transaction control
// below stays disabled regardless of network or wallet state.
export const metadata = {
  title: "Save & Win | YieldJack",
  description: "Deposit, track your principal, and see your standing in YieldJack's recurring prize draws.",
};

export default function SaveAndWinPage() {
  const { configured } = prizeSavingsReadiness;
  const productionAsset = productionManifest.contracts.productionAsset;

  return (
    <PageShell>
      <PageSection className="flex flex-col gap-8">
        <SectionHeader
          eyebrow="Save & Win"
          title="Your position"
          description="Deposit the production savings asset, track your principal, and see your standing in the current round."
        />

        <WalletPositionBar />

        <NetworkGuard>
          <PositionOverview productionAsset={productionAsset} />

          <div className="grid gap-5 lg:grid-cols-3">
            <DepositForm configured={configured} />
            <WithdrawForm configured={configured} />
            <ClaimPanel configured={configured} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <RoundTimeline />
            <RecentActivity />
          </div>
        </NetworkGuard>
      </PageSection>
    </PageShell>
  );
}
