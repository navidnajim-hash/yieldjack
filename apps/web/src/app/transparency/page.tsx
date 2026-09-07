import { AuditStatus } from "@/components/transparency/AuditStatus";
import { ContractRegistry } from "@/components/transparency/ContractRegistry";
import { DependencyFlow } from "@/components/transparency/DependencyFlow";
import { NetworkInfo } from "@/components/transparency/NetworkInfo";
import { SecurityControls } from "@/components/transparency/SecurityControls";
import { PageSection, PageShell } from "@/components/shared/PageShell";
import { RevenueSplit } from "@/components/shared/RevenueSplit";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { GITHUB_URL } from "@/lib/constants";
import { productionManifest } from "@/lib/production/resolver";

export const metadata = {
  title: "Transparency | YieldJack",
  description: "Every YieldJack production contract address, deployment status, and security control, in one place.",
};

export default function TransparencyPage() {
  return (
    <PageShell>
      <PageSection className="flex flex-col gap-12">
        <SectionHeader
          eyebrow="Transparency"
          title="Everything YieldJack runs on, in the open"
          description="Contract addresses, deployment status, and security controls — updated the moment a real contract is deployed, never guessed ahead of time."
        />

        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-foreground">Network</h3>
          <NetworkInfo />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">Contract registry</h3>
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
              Deployment status: {productionManifest.status}
            </span>
          </div>
          <ContractRegistry contracts={productionManifest.contracts} />
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-foreground">Contract dependency flow</h3>
          <DependencyFlow />
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-foreground">Creator-revenue allocation</h3>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <RevenueSplit />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-foreground">Security controls</h3>
          <SecurityControls />
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-foreground">Audit & source</h3>
          <AuditStatus />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start text-sm font-semibold text-accent hover:text-accent-hover"
          >
            View source on GitHub →
          </a>
        </div>
      </PageSection>
    </PageShell>
  );
}
