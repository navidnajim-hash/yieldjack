"use client";

import { MetricCard } from "@/components/shared/MetricCard";
import { TxButton } from "@/components/shared/TxButton";
import { PrelaunchNotice } from "@/components/shared/PrelaunchNotice";

/** See the activation note in `DepositForm.tsx` — the same applies here for claiming a won
 *  prize once the production prize engine exists. */
export function ClaimPanel({ configured }: { configured: boolean }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <h3 className="text-base font-semibold text-foreground">Claim prize</h3>
      <MetricCard label="Unclaimed prize" value="—" />
      <TxButton
        phase="idle"
        onClick={() => {}}
        disabled={!configured}
        disabledReason="Available when the production prize engine launches."
        idleLabel="Claim"
      />
      {!configured && <PrelaunchNotice>Available when the production prize engine launches.</PrelaunchNotice>}
    </div>
  );
}
