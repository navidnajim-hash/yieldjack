"use client";

import { useState } from "react";
import { TokenAmountInput } from "@/components/shared/TokenAmountInput";
import { TxButton } from "@/components/shared/TxButton";
import { PrelaunchNotice } from "@/components/shared/PrelaunchNotice";
import { parseTokenAmount } from "@/lib/format";

/**
 * Fully built deposit UI, wired for validation but not for submission — there is no production
 * vault deployed yet (`productionVault` in deployments/production/4663.json is null), so there is
 * no contract to send a deposit to. Once the vault is deployed and its ABI is added to
 * `src/lib/abis/`, wire a `useTxState().send({ address: productionVault, abi: vaultAbi,
 * functionName: "deposit", args: [amountRaw] })` call here in place of the disabled button.
 */
export function DepositForm({ configured, assetDecimals = 18 }: { configured: boolean; assetDecimals?: number }) {
  const [amount, setAmount] = useState("");
  const parsed = parseTokenAmount(amount, assetDecimals);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <h3 className="text-base font-semibold text-foreground">Deposit</h3>
      <TokenAmountInput
        id="deposit-amount"
        label="Amount"
        symbol="—"
        value={amount}
        onChange={setAmount}
        decimals={assetDecimals}
        disabled={!configured}
      />
      <TxButton
        phase="idle"
        onClick={() => {}}
        disabled={!configured || parsed === null}
        disabledReason="Available when the production vault launches."
        idleLabel="Deposit"
      />
      {!configured && <PrelaunchNotice>Available when the production vault launches.</PrelaunchNotice>}
    </div>
  );
}
