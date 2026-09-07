"use client";

import { parseUnits } from "viem";
import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { USDG_DECIMALS } from "@yieldjack/config";
import { useContract } from "@/hooks/useContract";
import { useTxState } from "@/hooks/useTxState";
import { useTokenBalance, useVaultSummary } from "@/hooks/useYieldJackData";
import { formatUsdg } from "@/lib/format";
import { TxStatus } from "@/components/shared/TxStatus";

export function DepositForm() {
  const { address } = useAccount();
  const usdg = useContract("MockUSDG");
  const vault = useContract("YieldJackVault");
  const { data: balanceData } = useTokenBalance("MockUSDG");
  const balance = balanceData as bigint | undefined;
  const { depositCap, totalPrincipal, isPaused, refetchPrincipal } = useVaultSummary();
  const [amountInput, setAmountInput] = useState("");
  const approveTx = useTxState();
  const depositTx = useTxState();

  const allowance = useReadContract({
    address: usdg?.address,
    abi: usdg?.abi,
    functionName: "allowance",
    args: address && vault ? [address, vault.address] : undefined,
    query: { enabled: !!usdg && !!vault && !!address },
  });

  let amount: bigint | undefined;
  try {
    amount = amountInput ? parseUnits(amountInput, USDG_DECIMALS) : undefined;
  } catch {
    amount = undefined;
  }

  const needsApproval = amount !== undefined && (allowance.data === undefined || (allowance.data as bigint) < amount);
  const remainingCap =
    depositCap !== undefined && totalPrincipal !== undefined ? depositCap - totalPrincipal : undefined;
  const overCap = amount !== undefined && remainingCap !== undefined && amount > remainingCap;
  const overBalance = amount !== undefined && balance !== undefined && amount > balance;

  const canSubmit =
    !!vault && !!usdg && amount !== undefined && amount > 0n && !overCap && !overBalance && !isPaused;

  async function handleApprove() {
    if (!usdg || !vault || amount === undefined) return;
    await approveTx.send({
      address: usdg.address,
      abi: usdg.abi,
      functionName: "approve",
      args: [vault.address, amount],
    });
    await allowance.refetch();
  }

  async function handleDeposit() {
    if (!vault || amount === undefined) return;
    await depositTx.send({
      address: vault.address,
      abi: vault.abi,
      functionName: "deposit",
      args: [amount],
    });
    setAmountInput("");
    await refetchPrincipal();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold text-foreground">Deposit Mock USDG</h3>

      {isPaused && (
        <p className="rounded-md border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-gold">
          Deposits are paused by the protocol admin. Withdrawals remain available.
        </p>
      )}

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
        <span>Wallet balance: {formatUsdg(balance)} mUSDG</span>
        {remainingCap !== undefined && <span>Cap remaining: {formatUsdg(remainingCap)} mUSDG</span>}
      </div>

      {overBalance && <p className="text-xs text-danger">Amount exceeds your wallet balance.</p>}
      {overCap && <p className="text-xs text-danger">Amount exceeds the remaining deposit cap.</p>}

      <div className="flex gap-2">
        {needsApproval ? (
          <button
            type="button"
            onClick={handleApprove}
            disabled={!canSubmit || approveTx.phase === "signing" || approveTx.phase === "confirming"}
            className="flex-1 rounded-md bg-surface-hover px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-border disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve mUSDG
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDeposit}
            disabled={!canSubmit || depositTx.phase === "signing" || depositTx.phase === "confirming"}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Deposit
          </button>
        )}
      </div>

      <TxStatus
        phase={needsApproval ? approveTx.phase : depositTx.phase}
        hash={needsApproval ? approveTx.hash : depositTx.hash}
        errorMessage={needsApproval ? approveTx.errorMessage : depositTx.errorMessage}
      />
    </div>
  );
}
