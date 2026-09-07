import { createPublicClient, createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { DemoPrizeEngineAbi, DemoRandomnessProviderAbi } from "@yieldjack/config";
import { loadKeeperConfig } from "./config.js";
import { log } from "./log.js";

/** How many rounds before `currentRoundId` to scan each tick for rounds still needing
 * fulfillment/finalization/rollover — not just the single most recently closed round, so a
 * backlog of unattended rounds (e.g. nobody finalized round N before round N+1, N+2...also
 * closed) never becomes permanently stuck. Bounded so each tick does a fixed amount of work. */
const ACTIONABLE_BACKLOG_SIZE = 20n;

/**
 * YieldJack keeper: reads on-chain draw state and calls the same permissionless functions any
 * user could call from the app (closeRound / fulfillRandomness / finalize / rollover) — it
 * never bypasses a contract rule or has any privileged path. Running this is optional; eligible
 * users can always progress a draw themselves from the frontend's testnet controls.
 */
async function main() {
  const cfg = loadKeeperConfig();

  const engineAddress = cfg.manifest.contracts.DemoPrizeEngine.address as Address | null;
  const randomnessAddress = cfg.manifest.contracts.DemoRandomnessProvider.address as Address | null;

  if (!engineAddress || !randomnessAddress) {
    log("error", `No deployment found for network "${cfg.network}". Run the deploy script first.`);
    process.exit(1);
  }

  if (!cfg.dryRun && !cfg.privateKey) {
    log("error", "DRY_RUN=false requires KEEPER_PRIVATE_KEY to be set. Refusing to start.");
    process.exit(1);
  }

  const publicClient = createPublicClient({ chain: cfg.chain, transport: http(cfg.rpcUrl) });

  const walletClient = cfg.dryRun
    ? undefined
    : createWalletClient({
        account: privateKeyToAccount(cfg.privateKey as `0x${string}`),
        chain: cfg.chain,
        transport: http(cfg.rpcUrl),
      });

  log(
    "info",
    `YieldJack keeper starting. network=${cfg.network} dryRun=${cfg.dryRun} pollInterval=${cfg.pollIntervalMs}ms engine=${engineAddress}`,
  );
  if (walletClient?.account) log("info", `Keeper wallet: ${walletClient.account.address}`);

  async function act(description: string, send: () => Promise<`0x${string}`>) {
    if (cfg.dryRun || !walletClient) {
      log("info", `[DRY RUN] Would call ${description}`);
      return;
    }
    log("info", `Calling ${description}...`);
    try {
      const hash = await send();
      log("info", `Sent ${description}: ${hash}`);
      await publicClient.waitForTransactionReceipt({ hash });
      log("info", `Confirmed ${description}`);
    } catch (err) {
      log("error", `${description} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function getRound(roundId: bigint) {
    return publicClient.readContract({
      address: engineAddress!,
      abi: DemoPrizeEngineAbi,
      functionName: "getRound",
      args: [roundId],
    });
  }

  /** Progresses a single backlog round: fulfil randomness, finalize, or roll over an expired
   *  unclaimed prize, as appropriate. Claiming is intentionally not handled here — only the
   *  winner's own wallet can claim, so that step always happens from the frontend. */
  async function progressRound(roundId: bigint, round: Awaited<ReturnType<typeof getRound>>, now: bigint) {
    if (round.state === 1) {
      const isFulfilled = await publicClient.readContract({
        address: randomnessAddress!,
        abi: DemoRandomnessProviderAbi,
        functionName: "isFulfilled",
        args: [round.requestId],
      });

      if (!isFulfilled) {
        const ready = await publicClient.readContract({
          address: randomnessAddress!,
          abi: DemoRandomnessProviderAbi,
          functionName: "readyToFulfill",
          args: [round.requestId],
        });
        if (ready) {
          await act(`fulfillRandomness (round ${roundId})`, () =>
            walletClient!.writeContract({
              address: randomnessAddress!,
              abi: DemoRandomnessProviderAbi,
              functionName: "fulfillRandomness",
              args: [round.requestId],
              chain: cfg.chain,
              account: walletClient!.account,
            }),
          );
        } else {
          log("info", `Round ${roundId} randomness requested but not yet ready to fulfill.`);
        }
      } else {
        await act(`finalize (round ${roundId})`, () =>
          walletClient!.writeContract({
            address: engineAddress!,
            abi: DemoPrizeEngineAbi,
            functionName: "finalize",
            args: [roundId],
            chain: cfg.chain,
            account: walletClient!.account,
          }),
        );
      }
      return;
    }

    if (round.state === 2 && !round.claimed && now >= round.claimDeadline) {
      await act(`rollover (round ${roundId})`, () =>
        walletClient!.writeContract({
          address: engineAddress!,
          abi: DemoPrizeEngineAbi,
          functionName: "rollover",
          args: [roundId],
          chain: cfg.chain,
          account: walletClient!.account,
        }),
      );
    }
  }

  async function tick() {
    try {
      const currentRoundId = (await publicClient.readContract({
        address: engineAddress!,
        abi: DemoPrizeEngineAbi,
        functionName: "currentRoundId",
      })) as bigint;

      const currentRound = await getRound(currentRoundId);
      const now = BigInt(Math.floor(Date.now() / 1000));

      if (currentRound.state === 0 && now >= currentRound.endTime) {
        await act(`closeRound (round ${currentRoundId})`, () =>
          walletClient!.writeContract({
            address: engineAddress!,
            abi: DemoPrizeEngineAbi,
            functionName: "closeRound",
            chain: cfg.chain,
            account: walletClient!.account,
          }),
        );
      }

      const oldestScanned = currentRoundId > ACTIONABLE_BACKLOG_SIZE ? currentRoundId - ACTIONABLE_BACKLOG_SIZE : 1n;
      for (let roundId = oldestScanned; roundId < currentRoundId; roundId++) {
        const round = await getRound(roundId);
        if (round.state === 1 || (round.state === 2 && !round.claimed)) {
          await progressRound(roundId, round, now);
        }
      }
    } catch (err) {
      log("error", `Tick failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await tick();
  setInterval(tick, cfg.pollIntervalMs);
}

main().catch((err) => {
  log("error", err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
