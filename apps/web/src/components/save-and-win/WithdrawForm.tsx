"use client";

import { useState } from "react";
import { TokenAmountInput } from "@/components/shared/TokenAmountInput";
import { TxButton } from "@/components/shared/TxButton";
import { PrelaunchNotice } from "@/components/shared/PrelaunchNotice";
import { parseTokenAmount } from "@/lib/format";

/** See the activation note in `DepositForm.tsx` — the same applies here for `withdraw`. Per
 *  CLAUDE.md, withdrawals must remain available during any administrative pause once the
 *  production vault exists; this UI never gates withdraw behind a "paused" state the way deposit
 *  legitimately can. */
export function WithdrawForm({ configured, assetDecimals = 18 }: { configured: boolean; assetDecimals?: number }) {
  const [amount, setAmount] = useState("");
  const parsed = parseTokenAmount(amount, assetDecimals);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <h3 className="text-base font-semibold text-foreground">Withdraw</h3>
      <TokenAmountInput
        id="withdraw-amount"
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
        idleLabel="Withdraw"
        variant="secondary"
      />
      {!configured && <PrelaunchNotice>Available when the production vault launches.</PrelaunchNotice>}
    </div>
  );
}
