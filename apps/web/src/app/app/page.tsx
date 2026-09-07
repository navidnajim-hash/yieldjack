import { BalanceCards } from "@/components/dashboard/BalanceCards";
import { ClaimPanel } from "@/components/dashboard/ClaimPanel";
import { DepositForm } from "@/components/dashboard/DepositForm";
import { DrawStatusTimeline } from "@/components/dashboard/DrawStatusTimeline";
import { FaucetPanel } from "@/components/dashboard/FaucetPanel";
import { SponsorForm } from "@/components/dashboard/SponsorForm";
import { TestnetControls } from "@/components/dashboard/TestnetControls";
import { WalletStatusBar } from "@/components/dashboard/WalletStatusBar";
import { WithdrawForm } from "@/components/dashboard/WithdrawForm";
import { NetworkGuard } from "@/components/shared/NetworkGuard";

export default function AppPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Your YieldJack dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Everything below reads and writes the deployed contracts directly — nothing here is
          simulated in the frontend.
        </p>
      </div>

      <NetworkGuard>
        <div className="flex flex-col gap-6">
          <WalletStatusBar />
          <ClaimPanel />
          <BalanceCards />
          <DrawStatusTimeline />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <DepositForm />
            <WithdrawForm />
            <FaucetPanel />
          </div>

          <SponsorForm />
          <TestnetControls />
        </div>
      </NetworkGuard>
    </div>
  );
}
