"use client";

import { parseUnits } from "viem";
import { useState } from "react";
import { USDG_DECIMALS } from "@yieldjack/config";
import { useContract } from "@/hooks/useContract";
import { useTxState } from "@/hooks/useTxState";
import { useVaultSummary } from "@/hooks/useYieldJackData";
import { formatUsdg } from "@/lib/format";
import { TxStatus } from "@/components/shared/TxStatus";

export function WithdrawForm() {
  const vault = useContract("YieldJackVault");
  const { principal, refetchPrincipal } = useVaultSummary();
  const [amountInput, setAmountInput] = useState("");
  const tx = useTxState();

  let amount: bigint | undefined;
  try {
    amount = amountInput ? parseUnits(amountInput, USDG_DECIMALS) : undefined;
  } catch {
    amount = undefined;
  }

  const overPrincipal = amount !== undefined && principal !== undefined && amount > principal;
  const canSubmit = !!vault && amount !== undefined && amount > 0n && !overPrincipal;

  async function handleWithdraw() {
    if (!vault || amount === undefined) return;
    await tx.send({
      address: vault.address,
      abi: vault.abi,
      functionName: "withdraw",
      args: [amount],
    });
    setAmountInput("");
    await refetchPrincipal();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold text-foreground">Withdraw</h3>
      <p className="text-xs text-muted">
        Always available, even if the protocol admin pauses new deposits.
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Amount (mUSDG)</span>
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder="0.00"
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
        />
      </label>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>Deposited principal: {formatUsdg(principal)} mUSDG</span>
        <button
          type="button"
          className="text-primary hover:text-primary-hover"
          onClick={() => setAmountInput(principal !== undefined ? String(Number(principal) / 10 ** USDG_DECIMALS) : "")}
        >
          Max
        </button>
      </div>

      {overPrincipal && <p className="text-xs text-danger">Amount exceeds your deposited principal.</p>}

      <button
        type="button"
        onClick={handleWithdraw}
        disabled={!canSubmit || tx.phase === "signing" || tx.phase === "confirming"}
        className="rounded-md bg-surface-hover px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-border disabled:cursor-not-allowed disabled:opacity-50"
      >
        Withdraw
      </button>

      <TxStatus phase={tx.phase} hash={tx.hash} errorMessage={tx.errorMessage} />
    </div>
  );
}
