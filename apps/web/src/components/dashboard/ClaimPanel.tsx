"use client";

import { useAccount } from "wagmi";
import { useContract } from "@/hooks/useContract";
import { useTxState } from "@/hooks/useTxState";
import { useCurrentRound, useRound } from "@/hooks/useYieldJackData";
import { formatUsdg } from "@/lib/format";
import { TxStatus } from "@/components/shared/TxStatus";

export function ClaimPanel() {
  const { address } = useAccount();
  const engine = useContract("DemoPrizeEngine");
  const { roundId } = useCurrentRound();
  const previousRoundId = roundId !== undefined && roundId > 1n ? roundId - 1n : undefined;
  const { round, refetch } = useRound(previousRoundId);
  const tx = useTxState();

  const isClaimable =
    !!address &&
    !!round &&
    round.state === 2 &&
    !round.claimed &&
    round.winner.toLowerCase() === address.toLowerCase() &&
    Math.floor(Date.now() / 1000) < Number(round.claimDeadline);

  if (!isClaimable || previousRoundId === undefined) return null;

  async function handleClaim() {
    if (!engine || previousRoundId === undefined) return;
    await tx.send({
      address: engine.address,
      abi: engine.abi,
      functionName: "claim",
      args: [previousRoundId],
    });
    await refetch();
  }

  return (
    <div className="animate-yj-glow rounded-xl border border-gold bg-gold/10 p-5 text-center">
      <p className="text-sm text-gold">You won round #{previousRoundId.toString()}!</p>
      <p className="mt-1 text-3xl font-semibold text-foreground">{formatUsdg(round?.prizeAmount)} mUSDG</p>
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
