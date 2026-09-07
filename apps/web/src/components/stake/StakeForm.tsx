"use client";

import { useEffect, useState } from "react";
import { PrelaunchNotice } from "@/components/shared/PrelaunchNotice";
import { TokenAmountInput } from "@/components/shared/TokenAmountInput";
import { TxButton } from "@/components/shared/TxButton";
import { TxStatus } from "@/components/shared/TxStatus";
import { useTxState } from "@/hooks/useTxState";
import { erc20Abi } from "@/lib/abis/erc20";
import { jackStakingRewardsAbi } from "@/lib/abis/jackStakingRewards";
import { parseTokenAmount } from "@/lib/format";
import type { Address } from "@/lib/production/resolver";

export function StakeForm({
  ready,
  disabledReason,
  paused,
  jackToken,
  jackStakingRewards,
  walletJackBalance,
  allowance,
  decimals,
  onChanged,
}: {
  ready: boolean;
  disabledReason?: string;
  paused: boolean;
  jackToken: Address | null;
  jackStakingRewards: Address | null;
  walletJackBalance: bigint | undefined;
  allowance: bigint | undefined;
  decimals: number;
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState("");
  const parsed = parseTokenAmount(amount, decimals);
  const approveTx = useTxState();
  const stakeTx = useTxState();

  useEffect(() => {
    if (approveTx.phase === "success") onChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveTx.phase]);

  useEffect(() => {
    if (stakeTx.phase === "success") {
      onChanged();
      setAmount("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stakeTx.phase]);

  const needsApproval = parsed !== null && parsed > 0n && (allowance ?? 0n) < parsed;
  const insufficientBalance = parsed !== null && walletJackBalance !== undefined && parsed > walletJackBalance;
  const invalidAmount = parsed === null || parsed === 0n;

  const effectiveReason = !ready ? disabledReason : paused ? "New stakes are currently paused." : undefined;
  const disabled = !ready || paused || invalidAmount || insufficientBalance;

  const handleApprove = async () => {
    if (!jackToken || !jackStakingRewards || parsed === null) return;
    try {
      await approveTx.send({
        address: jackToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [jackStakingRewards, parsed],
      });
    } catch {
      // Surfaced via approveTx.errorMessage below.
    }
  };

  const handleStake = async () => {
    if (!jackStakingRewards || parsed === null) return;
    try {
      await stakeTx.send({ address: jackStakingRewards, abi: jackStakingRewardsAbi, functionName: "stake", args: [parsed] });
    } catch {
      // Surfaced via stakeTx.errorMessage below.
    }
  };

  const activeTx = needsApproval ? approveTx : stakeTx;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <h3 className="text-base font-semibold text-foreground">Stake</h3>
      <TokenAmountInput
        id="stake-amount"
        label="Amount"
        symbol="JACK"
        value={amount}
        onChange={setAmount}
        maxValue={walletJackBalance}
        decimals={decimals}
        disabled={!ready || paused}
      />
      {insufficientBalance && <p className="text-xs text-danger">Amount exceeds your wallet JACK balance.</p>}
      {needsApproval ? (
        <TxButton
          phase={approveTx.phase}
          onClick={handleApprove}
          disabled={disabled}
          disabledReason={effectiveReason}
          idleLabel="Approve JACK"
        />
      ) : (
        <TxButton
          phase={stakeTx.phase}
          onClick={handleStake}
          disabled={disabled}
          disabledReason={effectiveReason}
          idleLabel="Stake"
        />
      )}
      <TxStatus phase={activeTx.phase} hash={activeTx.hash} errorMessage={activeTx.errorMessage} />
      {!ready && disabledReason && <PrelaunchNotice>{disabledReason}</PrelaunchNotice>}
    </div>
  );
}
