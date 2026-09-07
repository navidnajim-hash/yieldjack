import { useReadContracts } from "wagmi";
import { useContract } from "./useContract";
import { useCurrentRound, type RoundSummary } from "./useYieldJackData";

const MAX_ROUNDS_SHOWN = 25;

export interface HistoricalRound {
  roundId: bigint;
  round: RoundSummary;
}

/** Reads every completed round (everything before the currently open one), most recent first. */
export function useDrawHistory() {
  const engine = useContract("DemoPrizeEngine");
  const { roundId: currentRoundId } = useCurrentRound();

  const lastCompleted = currentRoundId !== undefined && currentRoundId > 1n ? currentRoundId - 1n : 0n;
  const firstShown = lastCompleted > BigInt(MAX_ROUNDS_SHOWN) ? lastCompleted - BigInt(MAX_ROUNDS_SHOWN) + 1n : 1n;

  const roundIds: bigint[] = [];
  for (let id = lastCompleted; id >= firstShown && id >= 1n; id--) {
    roundIds.push(id);
  }

  const contracts = roundIds.map((id) => ({
    address: engine?.address,
    abi: engine?.abi,
    functionName: "getRound" as const,
    args: [id] as const,
  }));

  const result = useReadContracts({
    contracts,
    query: { enabled: !!engine && roundIds.length > 0, refetchInterval: 8_000 },
  });

  const rounds: HistoricalRound[] = roundIds
    .map((roundId, i) => {
      const entry = result.data?.[i];
      if (!entry || entry.status !== "success") return undefined;
      return { roundId, round: entry.result as unknown as RoundSummary };
    })
    .filter((r): r is HistoricalRound => r !== undefined);

  return { rounds, isLoading: result.isLoading, hasAny: lastCompleted >= 1n };
}
