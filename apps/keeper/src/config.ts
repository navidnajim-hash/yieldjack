import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import "dotenv/config";
import { ANVIL_CHAIN_ID, localAnvil, robinhoodChainTestnet, type DeploymentManifest } from "@yieldjack/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

export type KeeperNetwork = "anvil" | "robinhood-testnet";

function loadManifest(chainId: number): DeploymentManifest {
  const file = path.join(repoRoot, "deployments", `${chainId}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as DeploymentManifest;
}

export function loadKeeperConfig() {
  const network: KeeperNetwork = process.env.KEEPER_NETWORK === "robinhood-testnet" ? "robinhood-testnet" : "anvil";
  const dryRun = process.env.DRY_RUN !== "false";
  const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS ?? 15_000);

  const chain = network === "robinhood-testnet" ? robinhoodChainTestnet : localAnvil;
  const rpcUrl =
    network === "robinhood-testnet"
      ? process.env.ROBINHOOD_TESTNET_RPC_URL || robinhoodChainTestnet.rpcUrls.default.http[0]
      : localAnvil.rpcUrls.default.http[0];

  const manifest = loadManifest(network === "robinhood-testnet" ? robinhoodChainTestnet.id : ANVIL_CHAIN_ID);

  return {
    network,
    dryRun,
    pollIntervalMs,
    chain,
    rpcUrl,
    manifest,
    privateKey: process.env.KEEPER_PRIVATE_KEY as `0x${string}` | undefined,
  };
}
