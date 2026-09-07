"use client";

import { useChainId } from "wagmi";
import { CONTRACT_NAMES } from "@yieldjack/config";
import { getDeploymentManifest } from "@/lib/deployments";
import { useVaultSummary } from "@/hooks/useYieldJackData";
import { formatUsdg } from "@/lib/format";
import { AddressPill } from "@/components/shared/AddressPill";
import { EmptyState } from "@/components/shared/EmptyState";

export default function TransparencyPage() {
  const chainId = useChainId();
  const manifest = getDeploymentManifest(chainId);
  const { depositCap, totalPrincipal, availableYield } = useVaultSummary();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div>
        <div className="mb-2 inline-flex rounded-full border border-danger/40 bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
          Not audited
        </div>
        <h1 className="text-3xl font-semibold text-foreground">Transparency</h1>
        <p className="mt-2 text-muted">
          Every address below comes from this deployment&apos;s committed manifest — nothing is
          hand-typed into the frontend.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Deployed contracts</h2>
        {manifest && manifest.deployedAt ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {CONTRACT_NAMES.map((name) => {
                  const entry = manifest.contracts[name];
                  return (
                    <tr key={name} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{name}</td>
                      <td className="px-4 py-3">
                        {entry.address ? (
                          <AddressPill address={entry.address} />
                        ) : (
                          <span className="text-muted">Not deployed</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {entry.blockNumber !== null ? `Block ${entry.blockNumber}` : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3">
            <EmptyState
              title="No deployment recorded for this network yet"
              description="Run the local or testnet deploy script, then this page will read straight from deployments/<chainId>.json."
            />
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Deposit cap" value={depositCap !== undefined ? `${formatUsdg(depositCap)} mUSDG` : "—"} />
        <Stat
          label="Total principal"
          value={totalPrincipal !== undefined ? `${formatUsdg(totalPrincipal)} mUSDG` : "—"}
        />
        <Stat
          label="Realized yield available"
          value={availableYield !== undefined ? `${formatUsdg(availableYield)} mUSDG` : "—"}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Principal and yield accounting</h2>
        <p className="text-sm text-muted">
          <code>YieldJackVault</code> tracks each depositor&apos;s principal internally (no
          receipt token is minted — see docs/ACCOUNTING_INVARIANTS.md). Available prize funds are
          computed as the vault&apos;s total claim on the yield source minus outstanding
          principal, so principal is structurally excluded from every prize calculation. Sponsor
          contributions are added directly to a round&apos;s prize and never touch principal or
          eligibility weight.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gold">Testnet limitations</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>MockUSDG and MockJACK are worthless, faucet-mintable test tokens.</li>
          <li>MockYieldSource simulates yield via an on-chain, capped, permissionless mint — it is not connected to any real Morpho, Steakhouse, or other yield venue.</li>
          <li>DemoRandomnessProvider derives randomness from a future block hash. This is explicitly insecure and unsuitable for mainnet — see docs/THREAT_MODEL.md.</li>
          <li>The active-participant set is capped at 256 wallets per round.</li>
          <li>Only WETH has ever been audited as a prize token in PoolTogether&apos;s prize-pool design this project took inspiration from — a fact this project has not attempted to change or claim otherwise for MockUSDG.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Still required for production</h2>
        <p className="text-sm text-muted">
          See <a href="/how-it-works" className="text-primary underline">How It Works</a> for the
          user-facing summary, and docs/PRODUCTION_ROADMAP.md in the repository for the complete,
          itemized list — including replacing every mock component, an independent audit, and
          legal review.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
