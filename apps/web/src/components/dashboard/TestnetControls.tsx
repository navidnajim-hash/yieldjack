"use client";

import { parseUnits } from "viem";
import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { USDG_DECIMALS } from "@yieldjack/config";
import { useContract } from "@/hooks/useContract";
import { useTxState } from "@/hooks/useTxState";
import { useActionableRounds } from "@/hooks/useDrawHistory";
import { useCurrentRound } from "@/hooks/useYieldJackData";
import { formatUsdg } from "@/lib/format";
import { TxStatus } from "@/components/shared/TxStatus";

function ActionButton({
  label,
  onClick,
  disabled,
  tx,
  tone = "primary",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tx: ReturnType<typeof useTxState>;
  tone?: "primary" | "gold";
}) {
  const busy = tx.phase === "signing" || tx.phase === "confirming";
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        className={`rounded-md px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          tone === "gold"
            ? "bg-gold/15 text-gold hover:bg-gold/25"
            : "bg-primary/15 text-primary hover:bg-primary/25"
        }`}
      >
        {label}
      </button>
      <TxStatus phase={tx.phase} hash={tx.hash} errorMessage={tx.errorMessage} />
    </div>
  );
}

function SimulateYieldControl() {
  const yieldSource = useContract("MockYieldSource");
  const [amountInput, setAmountInput] = useState("10");
  const tx = useTxState();

  async function handleSimulate() {
    if (!yieldSource) return;
    let amount: bigint;
    try {
      amount = parseUnits(amountInput || "0", USDG_DECIMALS);
    } catch {
      return;
    }
    if (amount <= 0n) return;
    await tx.send({
      address: yieldSource.address,
      abi: yieldSource.abi,
      functionName: "simulateYield",
      args: [amount],
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          step="any"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
          aria-label="Simulated yield amount"
        />
        <button
          type="button"
          onClick={handleSimulate}
          disabled={!yieldSource || tx.phase === "signing" || tx.phase === "confirming"}
          className="rounded-md bg-gold/15 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Simulate yield (mUSDG)
        </button>
      </div>
      <TxStatus phase={tx.phase} hash={tx.hash} errorMessage={tx.errorMessage} />
    </div>
  );
}

function useNow(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 2000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Fulfil/finalize/rollover controls for a single round from the actionable backlog — a
 *  round-1000 fully open round the frontend has never lost track of any of the demo, not just
 *  the single most recently closed one. */
function RoundActionRow({ roundId, round }: { roundId: bigint; round: { state: number; requestId: bigint; claimDeadline: bigint; claimed: boolean; prizeAmount: bigint } }) {
  const engine = useContract("DemoPrizeEngine");
  const randomness = useContract("DemoRandomnessProvider");
  const now = useNow();

  const fulfillTx = useTxState();
  const finalizeTx = useTxState();
  const rolloverTx = useTxState();

  const awaitingRandomness = round.state === 1;

  const readyToFulfill = useReadContract({
    address: randomness?.address,
    abi: randomness?.abi,
    functionName: "readyToFulfill",
    args: [round.requestId],
    query: { enabled: !!randomness && awaitingRandomness, refetchInterval: 4000 },
  });

  const isFulfilled = useReadContract({
    address: randomness?.address,
    abi: randomness?.abi,
    functionName: "isFulfilled",
    args: [round.requestId],
    query: { enabled: !!randomness && awaitingRandomness, refetchInterval: 4000 },
  });

  const canFulfill = awaitingRandomness && readyToFulfill.data === true && isFulfilled.data !== true;
  const canFinalize = awaitingRandomness && isFulfilled.data === true;
  const canRollover = round.state === 2 && !round.claimed && now >= Number(round.claimDeadline);

  async function handleFulfill() {
    if (!randomness) return;
    await fulfillTx.send({
      address: randomness.address,
      abi: randomness.abi,
      functionName: "fulfillRandomness",
      args: [round.requestId],
    });
  }

  async function handleFinalize() {
    if (!engine) return;
    await finalizeTx.send({ address: engine.address, abi: engine.abi, functionName: "finalize", args: [roundId] });
  }

  async function handleRollover() {
    if (!engine) return;
    await rolloverTx.send({ address: engine.address, abi: engine.abi, functionName: "rollover", args: [roundId] });
  }

  return (
    <div className="rounded-lg border border-border bg-surface/60 p-3">
      <p className="mb-2 text-xs font-medium text-foreground">
        Round #{roundId.toString()} · {formatUsdg(round.prizeAmount)} mUSDG
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <ActionButton label="Fulfil demo randomness" onClick={handleFulfill} disabled={!canFulfill} tx={fulfillTx} />
        <ActionButton label="Finalize winner" onClick={handleFinalize} disabled={!canFinalize} tx={finalizeTx} />
        <ActionButton
          label="Roll over unclaimed prize"
          onClick={handleRollover}
          disabled={!canRollover}
          tx={rolloverTx}
          tone="gold"
        />
      </div>
    </div>
  );
}

export function TestnetControls() {
  const engine = useContract("DemoPrizeEngine");
  const { round: currentRound } = useCurrentRound();
  const { actionable, isLoading } = useActionableRounds();
  const now = useNow();

  const closeTx = useTxState();
  const canClose = !!currentRound && currentRound.state === 0 && now >= Number(currentRound.endTime);

  async function handleClose() {
    if (!engine) return;
    await closeTx.send({ address: engine.address, abi: engine.abi, functionName: "closeRound" });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dashed border-gold/40 bg-gold/5 p-5">
      <div>
        <h3 className="text-sm font-semibold text-gold">Testnet-only demo controls</h3>
        <p className="text-xs text-muted">
          These permissionless functions exist so anyone can progress a demo draw without
          waiting. Every eligible user can call them from here — there is no admin-only path.
          Every round still needing attention is listed below, not just the most recent one.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SimulateYieldControl />
        <ActionButton label="Close expired round" onClick={handleClose} disabled={!canClose} tx={closeTx} />
      </div>

      {!isLoading && actionable.length === 0 && (
        <p className="text-xs text-muted">No rounds are currently waiting on randomness, finalization, or rollover.</p>
      )}

      {actionable.length > 0 && (
        <div className="flex flex-col gap-2">
          {actionable.map(({ roundId, round }) => (
            <RoundActionRow key={roundId.toString()} roundId={roundId} round={round} />
          ))}
        </div>
      )}
    </div>
  );
}
