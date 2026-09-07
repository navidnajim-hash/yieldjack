import { useReadContracts } from "wagmi";
import { useContract } from "./useContract";
import { useCurrentRound, type RoundSummary } from "./useYieldJackData";

const MAX_ROUNDS_SHOWN = 25;

/** How far back (in round IDs) to scan for rounds still needing action — fulfilling
 * randomness, finalizing, claiming, or rolling over. Bounded so the scan is a fixed-size
 * multicall, not an unbounded loop, but large enough that a backlog of unattended rounds
 * (e.g. nobody finalized round N before round N+1, N+2... also closed) stays reachable rather
 * than silently falling off the edge of "just check currentRoundId - 1". */
const ACTIONABLE_BACKLOG_SIZE = 20;

export interface HistoricalRound {
  roundId: bigint;
  round: RoundSummary;
}

/**
 * Pure: computes which completed round IDs to scan, most-recent-first, given the currently
 * open round and how many to look back. Bounded — never grows past `count` entries — but,
 * critically, `count` looks *backward from the current round*, not just at `currentRoundId - 1`,
 * so a round that's several closes behind (nobody progressed it in time) is still included
 * rather than falling permanently out of view. Exported and kept pure so this range logic is
 * unit-testable without a wagmi provider.
 */
export function computeBacklogRoundIds(currentRoundId: bigint | undefined, count: number): bigint[] {
  const lastCompleted = currentRoundId !== undefined && currentRoundId > 1n ? currentRoundId - 1n : 0n;
  const firstShown = lastCompleted > BigInt(count) ? lastCompleted - BigInt(count) + 1n : 1n;

  const roundIds: bigint[] = [];
  for (let id = lastCompleted; id >= firstShown && id >= 1n; id--) {
    roundIds.push(id);
  }
  return roundIds;
}

/**
 * Pure: whether a round still needs *something* done to it — awaiting randomness
 * fulfillment/finalization, or awarded and either still claimable or rollover-able. Exported and
 * kept pure (no chain reads) so this classification is unit-testable directly.
 */
export function isRoundActionable(round: Pick<RoundSummary, "state" | "claimed">): boolean {
  if (round.state === 1) return true; // RANDOMNESS_REQUESTED: needs fulfil + finalize
  if (round.state === 2 && !round.claimed) return true; // AWARDED: claimable or rollover-able
  return false;
}

/** Reads up to `count` completed rounds (everything before the currently open one), most
 *  recent first — the shared primitive both `useDrawHistory` and `useActionableRounds` build
 *  on, so there's one multicall doing the fetching rather than several independent ones. */
function useRoundsBacklog(count: number) {
  const engine = useContract("DemoPrizeEngine");
  const { roundId: currentRoundId } = useCurrentRound();

  const roundIds = computeBacklogRoundIds(currentRoundId, count);
  const lastCompleted = currentRoundId !== undefined && currentRoundId > 1n ? currentRoundId - 1n : 0n;

  const contracts = roundIds.map((id) => ({
    address: engine?.address,
    abi: engine?.abi,
    functionName: "getRound" as const,
    args: [id] as const,
  }));

  const result = useReadContracts({
    contracts,
    query: { enabled: !!engine && roundIds.length > 0, refetchInterval: 6_000 },
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

/** Every completed round within the display backlog, most recent first — for the draw history
 *  table. */
export function useDrawHistory() {
  return useRoundsBacklog(MAX_ROUNDS_SHOWN);
}

/** Every round in the actionable backlog that still needs *something* done to it: awaiting
 *  randomness fulfillment/finalization, or awarded and still within its claim window (or past
 *  it and rollover-able). Scans a bounded window of round IDs — not just the single most
 *  recently closed round — so an older round that nobody progressed in time doesn't become
 *  permanently inaccessible from the UI. Oldest-first, so a backlog is worked off in order. */
export function useActionableRounds() {
  const { rounds, isLoading } = useRoundsBacklog(ACTIONABLE_BACKLOG_SIZE);

  const actionable = rounds
    .filter(({ round }) => isRoundActionable(round))
    .sort((a, b) => (a.roundId < b.roundId ? -1 : a.roundId > b.roundId ? 1 : 0));

  return { actionable, isLoading };
}
