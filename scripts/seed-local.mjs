#!/usr/bin/env node
// Seeds the local Anvil deployment with a handful of demo participants who deposited at
// different times (so their eligibility weights differ visibly), plus some simulated yield —
// leaving the current round OPEN so a demo can interactively close it, fulfil randomness,
// finalize, and claim from the frontend. Local Anvil only; refuses to run against anything else.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createPublicClient, createWalletClient, http, parseUnits, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const localAnvil = defineChain({
  id: 31337,
  name: "Local Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

const DEPLOYER_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
// Simple, valid, non-zero scalars used purely as throwaway local-demo keys — not anvil's
// canonical pre-funded accounts, so this script funds them itself with a real ETH transfer.
// Safe only because this whole script refuses to run against anything but chain id 31337.
const PARTICIPANT_KEYS = [
  "0x0000000000000000000000000000000000000000000000000000000000000001",
  "0x0000000000000000000000000000000000000000000000000000000000000002",
  "0x0000000000000000000000000000000000000000000000000000000000000003",
];

function readAbi(contractName) {
  const artifactPath = path.join(
    repoRoot,
    "packages/contracts/out",
    `${contractName}.sol`,
    `${contractName}.json`,
  );
  if (!existsSync(artifactPath)) {
    console.error(`error: missing build artifact for ${contractName}. Run \`pnpm contracts:build\` first.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(artifactPath, "utf8")).abi;
}

function readManifest() {
  const manifestPath = path.join(repoRoot, "deployments/31337.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!manifest.deployedAt) {
    console.error("error: deployments/31337.json has no deployment recorded. Run `pnpm demo:deploy` first.");
    process.exit(1);
  }
  return manifest;
}

async function main() {
  const manifest = readManifest();
  const publicClient = createPublicClient({ chain: localAnvil, transport: http() });

  const chainId = await publicClient.getChainId();
  if (chainId !== 31337) {
    console.error(`error: expected a local Anvil node (chain id 31337) at http://127.0.0.1:8545, got ${chainId}.`);
    process.exit(1);
  }

  const deployer = createWalletClient({ account: privateKeyToAccount(DEPLOYER_KEY), chain: localAnvil, transport: http() });

  const usdgAbi = readAbi("MockUSDG");
  const jackAbi = readAbi("MockJACK");
  const yieldSourceAbi = readAbi("MockYieldSource");
  const vaultAbi = readAbi("YieldJackVault");
  const engineAbi = readAbi("DemoPrizeEngine");

  const usdg = manifest.contracts.MockUSDG.address;
  const jack = manifest.contracts.MockJACK.address;
  const yieldSource = manifest.contracts.MockYieldSource.address;
  const vault = manifest.contracts.YieldJackVault.address;
  const engine = manifest.contracts.DemoPrizeEngine.address;

  const roundDuration = await publicClient.readContract({
    address: engine,
    abi: engineAbi,
    functionName: "roundDuration",
  });
  const timeStep = roundDuration / 4n;

  async function sendAndWait(client, params) {
    const hash = await client.writeContract(params);
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async function advanceTime(seconds) {
    await publicClient.request({ method: "evm_increaseTime", params: [Number(seconds)] });
    await publicClient.request({ method: "evm_mine", params: [] });
  }

  const participants = PARTICIPANT_KEYS.map((key) => ({
    account: privateKeyToAccount(key),
    wallet: createWalletClient({ account: privateKeyToAccount(key), chain: localAnvil, transport: http() }),
  }));

  console.log("Funding demo participants with ETH for gas...");
  for (const p of participants) {
    const hash = await deployer.sendTransaction({ to: p.account.address, value: parseUnits("2", 18) });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  console.log("Minting mUSDG and mJACK to participants and the deployer...");
  for (const p of participants) {
    await sendAndWait(deployer, {
      address: usdg,
      abi: usdgAbi,
      functionName: "mint",
      args: [p.account.address, parseUnits("5000", 6)],
    });
    await sendAndWait(deployer, {
      address: jack,
      abi: jackAbi,
      functionName: "ownerMint",
      args: [p.account.address, parseUnits("1000", 18)],
    });
  }
  await sendAndWait(deployer, {
    address: jack,
    abi: jackAbi,
    functionName: "ownerMint",
    args: [deployer.account.address, parseUnits("1000", 18)],
  });

  const depositAmounts = [parseUnits("1000", 6), parseUnits("1000", 6), parseUnits("500", 6)];

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    console.log(`Participant ${i + 1} (${p.account.address}) depositing ${depositAmounts[i]} raw mUSDG...`);
    await sendAndWait(p.wallet, {
      address: usdg,
      abi: usdgAbi,
      functionName: "approve",
      args: [vault, depositAmounts[i]],
    });
    await sendAndWait(p.wallet, {
      address: vault,
      abi: vaultAbi,
      functionName: "deposit",
      args: [depositAmounts[i]],
    });

    if (i < participants.length - 1) {
      console.log(`Advancing time by ${timeStep}s so later deposits carry less weight...`);
      await advanceTime(timeStep);
    }
  }

  console.log("Simulating yield...");
  await sendAndWait(deployer, {
    address: yieldSource,
    abi: yieldSourceAbi,
    functionName: "simulateYield",
    args: [parseUnits("50", 6)],
  });

  const round = await publicClient.readContract({
    address: engine,
    abi: engineAbi,
    functionName: "getRound",
    args: [await publicClient.readContract({ address: engine, abi: engineAbi, functionName: "currentRoundId" })],
  });

  console.log("\nSeed complete. Current round is still OPEN so you can drive the rest of the");
  console.log("flow (close / fulfil randomness / finalize / claim) from the app's testnet controls.\n");
  console.log(`Current prize: ${round.prizeAmount} (raw, 6 decimals)`);
  console.log("\nDemo participant accounts (local Anvil only, funded by this script):");
  participants.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.account.address}  (private key: ${PARTICIPANT_KEYS[i]})`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
