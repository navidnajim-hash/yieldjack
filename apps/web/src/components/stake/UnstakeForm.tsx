"use client";

import { useEffect, useState } from "react";
import { PrelaunchNotice } from "@/components/shared/PrelaunchNotice";
import { TokenAmountInput } from "@/components/shared/TokenAmountInput";
import { TxButton } from "@/components/shared/TxButton";
import { TxStatus } from "@/components/shared/TxStatus";
import { useTxState } from "@/hooks/useTxState";
import { jackStakingRewardsAbi } from "@/lib/abis/jackStakingRewards";
import { parseTokenAmount } from "@/lib/format";
import type { Address } from "@/lib/production/resolver";

/** Unstaking is never gated by the staking contract's pause state — `withdraw` never carries
 *  `whenNotPaused` (see packages/contracts/src/staking/JackStakingRewards.sol) — only by whether
 *  the contracts are configured and live, and by having a staked balance to withdraw. */
export function UnstakeForm({
  ready,
  disabledReason,
  jackStakingRewards,
  stakedJack,
  decimals,
  onChanged,
}: {
  ready: boolean;
  disabledReason?: string;
  jackStakingRewards: Address | null;
  stakedJack: bigint | undefined;
  decimals: number;
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState("");
  const parsed = parseTokenAmount(amount, decimals);
  const withdrawTx = useTxState();

  useEffect(() => {
    if (withdrawTx.phase === "success") {
      onChanged();
      setAmount("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withdrawTx.phase]);

  const invalidAmount = parsed === null || parsed === 0n;
  const exceedsStaked = parsed !== null && stakedJack !== undefined && parsed > stakedJack;
  const disabled = !ready || invalidAmount || exceedsStaked;

  const handleWithdraw = async () => {
    if (!jackStakingRewards || parsed === null) return;
    try {
      await withdrawTx.send({
        address: jackStakingRewards,
        abi: jackStakingRewardsAbi,
        functionName: "withdraw",
        args: [parsed],
      });
    } catch {
      // Surfaced via withdrawTx.errorMessage below.
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <h3 className="text-base font-semibold text-foreground">Unstake</h3>
      <TokenAmountInput
        id="unstake-amount"
        label="Amount"
        symbol="JACK"
        value={amount}
        onChange={setAmount}
        maxValue={stakedJack}
        decimals={decimals}
        disabled={!ready}
      />
      {exceedsStaked && <p className="text-xs text-danger">Amount exceeds your staked JACK balance.</p>}
      <TxButton
        phase={withdrawTx.phase}
        onClick={handleWithdraw}
        disabled={disabled}
        disabledReason={!ready ? disabledReason : undefined}
        idleLabel="Unstake"
        variant="secondary"
      />
      <TxStatus phase={withdrawTx.phase} hash={withdrawTx.hash} errorMessage={withdrawTx.errorMessage} />
      {!ready && disabledReason && <PrelaunchNotice>{disabledReason}</PrelaunchNotice>}
    </div>
  );
}
