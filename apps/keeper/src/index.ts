import { createPublicClient, createWalletClient, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { DemoPrizeEngineAbi, DemoRandomnessProviderAbi } from "@yieldjack/config";
import { loadKeeperConfig } from "./config.js";
import { log } from "./log.js";

/**
 * YieldJack keeper: reads on-chain draw state and calls the same permissionless functions any
 * user could call from the app (closeRound / fulfillRandomness / finalize) — it never bypasses
 * a contract rule or has any privileged path. Running this is optional; eligible users can
 * always progress a draw themselves from the frontend's testnet controls.
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

  async function tick() {
    try {
      const currentRoundId = (await publicClient.readContract({
        address: engineAddress!,
        abi: DemoPrizeEngineAbi,
        functionName: "currentRoundId",
      })) as bigint;

      const currentRound = await publicClient.readContract({
        address: engineAddress!,
        abi: DemoPrizeEngineAbi,
        functionName: "getRound",
        args: [currentRoundId],
      });

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

      if (currentRoundId > 1n) {
        const previousRoundId = currentRoundId - 1n;
        const previousRound = await publicClient.readContract({
          address: engineAddress!,
          abi: DemoPrizeEngineAbi,
          functionName: "getRound",
          args: [previousRoundId],
        });

        if (previousRound.state === 1) {
          const isFulfilled = await publicClient.readContract({
            address: randomnessAddress!,
            abi: DemoRandomnessProviderAbi,
            functionName: "isFulfilled",
            args: [previousRound.requestId],
          });

          if (!isFulfilled) {
            const ready = await publicClient.readContract({
              address: randomnessAddress!,
              abi: DemoRandomnessProviderAbi,
              functionName: "readyToFulfill",
              args: [previousRound.requestId],
            });
            if (ready) {
              await act(`fulfillRandomness (round ${previousRoundId})`, () =>
                walletClient!.writeContract({
                  address: randomnessAddress!,
                  abi: DemoRandomnessProviderAbi,
                  functionName: "fulfillRandomness",
                  args: [previousRound.requestId],
                  chain: cfg.chain,
                  account: walletClient!.account,
                }),
              );
            } else {
              log("info", `Round ${previousRoundId} randomness requested but not yet ready to fulfill.`);
            }
          } else {
            await act(`finalize (round ${previousRoundId})`, () =>
              walletClient!.writeContract({
                address: engineAddress!,
                abi: DemoPrizeEngineAbi,
                functionName: "finalize",
                args: [previousRoundId],
                chain: cfg.chain,
                account: walletClient!.account,
              }),
            );
          }
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
