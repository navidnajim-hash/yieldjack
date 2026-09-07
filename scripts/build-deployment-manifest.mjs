#!/usr/bin/env node
// Reads a Foundry broadcast artifact (written by `forge script ... --broadcast`) and produces
// deployments/<chainId>.json in the schema apps/web and apps/keeper expect. Usage:
//   node scripts/build-deployment-manifest.mjs <chainId>
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const chainId = Number(process.argv[2]);
if (!chainId) {
  console.error("Usage: node scripts/build-deployment-manifest.mjs <chainId>");
  process.exit(1);
}

const SCRIPT_BY_CHAIN = {
  31337: { scriptFile: "DeployLocal.s.sol", name: "anvil" },
  46630: { scriptFile: "DeployTestnet.s.sol", name: "robinhood-chain-testnet" },
  4663: { scriptFile: "DeployMainnetDemo.s.sol", name: "robinhood-chain-mainnet-demo" },
};

const CONTRACT_NAMES = [
  "MockUSDG",
  "MockJACK",
  "MockYieldSource",
  "DemoRandomnessProvider",
  "YieldJackVault",
  "DemoPrizeEngine",
  "SponsorRegistry",
];

const entry = SCRIPT_BY_CHAIN[chainId];
if (!entry) {
  console.error(`error: no known deploy script for chain id ${chainId}`);
  process.exit(1);
}

const broadcastPath = path.join(
  repoRoot,
  "packages/contracts/broadcast",
  entry.scriptFile,
  String(chainId),
  "run-latest.json",
);

if (!existsSync(broadcastPath)) {
  console.error(`error: no broadcast artifact found at ${broadcastPath}. Did the deploy succeed?`);
  process.exit(1);
}

const broadcast = JSON.parse(readFileSync(broadcastPath, "utf8"));
const transactions = broadcast.transactions ?? [];
const receipts = broadcast.receipts ?? [];

const contracts = Object.fromEntries(CONTRACT_NAMES.map((n) => [n, { address: null, blockNumber: null }]));

let matched = 0;
transactions.forEach((tx, i) => {
  if (tx.transactionType !== "CREATE" && tx.transactionType !== "CREATE2") return;
  const name = tx.contractName;
  if (!name || !CONTRACT_NAMES.includes(name)) return;

  const receipt = receipts[i];
  const blockNumberHex = receipt?.blockNumber;
  contracts[name] = {
    address: tx.contractAddress,
    blockNumber: blockNumberHex ? Number.parseInt(blockNumberHex, 16) : null,
  };
  matched += 1;
});

if (matched < CONTRACT_NAMES.length) {
  const missing = CONTRACT_NAMES.filter((n) => !contracts[n].address);
  console.error(`error: broadcast artifact is missing contracts: ${missing.join(", ")}`);
  console.error("The deploy may have partially failed — check the forge script output above.");
  process.exit(1);
}

const manifest = {
  chainId,
  name: entry.name,
  deployedAt: new Date().toISOString(),
  contracts,
};

const outPath = path.join(repoRoot, "deployments", `${chainId}.json`);
writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${path.relative(repoRoot, outPath)}`);
for (const name of CONTRACT_NAMES) {
  console.log(`  ${name.padEnd(24)} ${contracts[name].address}`);
}
