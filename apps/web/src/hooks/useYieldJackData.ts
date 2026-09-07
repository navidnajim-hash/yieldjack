import { useAccount, useReadContract } from "wagmi";
import { useContract } from "./useContract";

const REFETCH_INTERVAL_MS = 6_000;

export function useTokenBalance(tokenName: "MockUSDG" | "MockJACK", account?: `0x${string}`) {
  const token = useContract(tokenName);
  const { address: connected } = useAccount();
  const target = account ?? connected;

  return useReadContract({
    address: token?.address,
    abi: token?.abi,
    functionName: "balanceOf",
    args: target ? [target] : undefined,
    query: { enabled: !!token && !!target, refetchInterval: REFETCH_INTERVAL_MS },
  });
}

export function useFaucetInfo(tokenName: "MockUSDG" | "MockJACK") {
  const token = useContract(tokenName);
  const { address } = useAccount();

  const lastClaim = useReadContract({
    address: token?.address,
    abi: token?.abi,
    functionName: "lastFaucetClaim",
    args: address ? [address] : undefined,
    query: { enabled: !!token && !!address, refetchInterval: REFETCH_INTERVAL_MS },
  });

  const cooldown = useReadContract({
    address: token?.address,
    abi: token?.abi,
    functionName: "FAUCET_COOLDOWN",
    query: { enabled: !!token },
  });

  const amount = useReadContract({
    address: token?.address,
    abi: token?.abi,
    functionName: "FAUCET_AMOUNT",
    query: { enabled: !!token },
  });

  const lastClaimAt = typeof lastClaim.data === "bigint" ? lastClaim.data : 0n;
  const cooldownSeconds = typeof cooldown.data === "bigint" ? cooldown.data : 0n;
  const nextClaimAt = lastClaimAt > 0n ? lastClaimAt + cooldownSeconds : 0n;

  return {
    contract: token,
    faucetAmount: amount.data as bigint | undefined,
    nextClaimAt,
    isLoading: lastClaim.isLoading || cooldown.isLoading,
  };
}

export function useVaultSummary(account?: `0x${string}`) {
  const vault = useContract("YieldJackVault");
  const { address: connected } = useAccount();
  const target = account ?? connected;

  const principal = useReadContract({
    address: vault?.address,
    abi: vault?.abi,
    functionName: "principal",
    args: target ? [target] : undefined,
    query: { enabled: !!vault && !!target, refetchInterval: REFETCH_INTERVAL_MS },
  });

  const totalPrincipal = useReadContract({
    address: vault?.address,
    abi: vault?.abi,
    functionName: "totalPrincipal",
    query: { enabled: !!vault, refetchInterval: REFETCH_INTERVAL_MS },
  });

  const depositCap = useReadContract({
    address: vault?.address,
    abi: vault?.abi,
    functionName: "depositCap",
    query: { enabled: !!vault, refetchInterval: REFETCH_INTERVAL_MS },
  });

  const availableYield = useReadContract({
    address: vault?.address,
    abi: vault?.abi,
    functionName: "availableYield",
    query: { enabled: !!vault, refetchInterval: REFETCH_INTERVAL_MS },
  });

  const paused = useReadContract({
    address: vault?.address,
    abi: vault?.abi,
    functionName: "paused",
    query: { enabled: !!vault, refetchInterval: REFETCH_INTERVAL_MS },
  });

  return {
    contract: vault,
    principal: principal.data as bigint | undefined,
    totalPrincipal: totalPrincipal.data as bigint | undefined,
    depositCap: depositCap.data as bigint | undefined,
    availableYield: availableYield.data as bigint | undefined,
    isPaused: paused.data as boolean | undefined,
    isLoading: principal.isLoading || totalPrincipal.isLoading || depositCap.isLoading,
    refetchPrincipal: principal.refetch,
  };
}

export function useCurrentRound() {
  const engine = useContract("DemoPrizeEngine");

  const currentRoundId = useReadContract({
    address: engine?.address,
    abi: engine?.abi,
    functionName: "currentRoundId",
    query: { enabled: !!engine, refetchInterval: REFETCH_INTERVAL_MS },
  });

  const roundId = currentRoundId.data as bigint | undefined;

  const round = useReadContract({
    address: engine?.address,
    abi: engine?.abi,
    functionName: "getRound",
    args: roundId !== undefined ? [roundId] : undefined,
    query: { enabled: !!engine && roundId !== undefined, refetchInterval: REFETCH_INTERVAL_MS },
  });

  return {
    contract: engine,
    roundId,
    round: round.data as RoundSummary | undefined,
    isLoading: currentRoundId.isLoading || round.isLoading,
    refetch: round.refetch,
  };
}

export function useRound(roundId: bigint | undefined) {
  const engine = useContract("DemoPrizeEngine");
  const round = useReadContract({
    address: engine?.address,
    abi: engine?.abi,
    functionName: "getRound",
    args: roundId !== undefined ? [roundId] : undefined,
    query: { enabled: !!engine && roundId !== undefined, refetchInterval: REFETCH_INTERVAL_MS },
  });
  return { round: round.data as RoundSummary | undefined, isLoading: round.isLoading, refetch: round.refetch };
}

export function useEstimatedChance(account?: `0x${string}`) {
  const engine = useContract("DemoPrizeEngine");
  const { address: connected } = useAccount();
  const target = account ?? connected;

  const chance = useReadContract({
    address: engine?.address,
    abi: engine?.abi,
    functionName: "estimatedChanceBps",
    args: target ? [target] : undefined,
    query: { enabled: !!engine && !!target, refetchInterval: REFETCH_INTERVAL_MS },
  });

  return { bps: chance.data as bigint | undefined, isLoading: chance.isLoading };
}

/** Mirrors DemoPrizeEngine.RoundSummary (see packages/contracts/src/prize/DemoPrizeEngine.sol). */
export interface RoundSummary {
  state: number;
  startTime: bigint;
  endTime: bigint;
  awardedAt: bigint;
  claimDeadline: bigint;
  prizeAmount: bigint;
  totalWeight: bigint;
  requestId: bigint;
  winner: `0x${string}`;
  claimed: boolean;
  participantCount: bigint;
  lastSponsor: `0x${string}`;
  lastSponsorMetadata: string;
  sponsorAmount: bigint;
  sponsorJackBurned: bigint;
  sponsorCount: bigint;
}

export const ROUND_STATE_NAMES = [
  "Open",
  "Randomness requested",
  "Awarded",
  "Claimed",
  "Expired",
] as const;
