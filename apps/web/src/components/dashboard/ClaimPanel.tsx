"use client";

import { useAccount } from "wagmi";
import { useContract } from "@/hooks/useContract";
import { useTxState } from "@/hooks/useTxState";
import { useActionableRounds } from "@/hooks/useDrawHistory";
import { formatUsdg } from "@/lib/format";
import { TxStatus } from "@/components/shared/TxStatus";

function ClaimCard({ roundId, prizeAmount }: { roundId: bigint; prizeAmount: bigint }) {
  const engine = useContract("DemoPrizeEngine");
  const tx = useTxState();

  async function handleClaim() {
    if (!engine) return;
    await tx.send({ address: engine.address, abi: engine.abi, functionName: "claim", args: [roundId] });
  }

  return (
    <div className="animate-yj-glow rounded-xl border border-gold bg-gold/10 p-5 text-center">
      <p className="text-sm text-gold">You won round #{roundId.toString()}!</p>
      <p className="mt-1 text-3xl font-semibold text-foreground">{formatUsdg(prizeAmount)} mUSDG</p>
      <button
        type="button"
        onClick={handleClaim}
        disabled={tx.phase === "signing" || tx.phase === "confirming"}
        className="mt-4 rounded-md bg-gold px-6 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        Claim prize
      </button>
      <div className="mt-2 flex justify-center">
        <TxStatus phase={tx.phase} hash={tx.hash} errorMessage={tx.errorMessage} />
      </div>
    </div>
  );
}

/** Shows a claim card for every round in the actionable backlog the connected wallet won and
 *  hasn't claimed yet — not just the single most recently closed round, so an older unclaimed
 *  prize (e.g. because several rounds closed before anyone finalized an earlier one) is never
 *  invisible to its winner. */
export function ClaimPanel() {
  const { address } = useAccount();
  const { actionable } = useActionableRounds();

  if (!address) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const claimable = actionable.filter(
    ({ round }) =>
      round.state === 2 &&
      !round.claimed &&
      round.winner.toLowerCase() === address.toLowerCase() &&
      nowSeconds < Number(round.claimDeadline),
  );

  if (claimable.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {claimable.map(({ roundId, round }) => (
        <ClaimCard key={roundId.toString()} roundId={roundId} prizeAmount={round.prizeAmount} />
      ))}
    </div>
  );
}
