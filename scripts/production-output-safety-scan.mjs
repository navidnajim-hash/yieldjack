#!/usr/bin/env node
// Scans the production app's built static output (apps/web/out) for any trace of the demo/mock
// system — mock contract names, the known mJACK/mUSDG addresses, the mainnet-demo banner, or
// demo-only copy like "testnet faucet" / "simulate yield". Exits non-zero if anything is found.
// Deliberately does NOT run against apps/demo-web/out — those terms correctly belong there.
//
// Usage: node scripts/production-output-safety-scan.mjs [outDir]
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.resolve(repoRoot, process.argv[2] ?? "apps/web/out");

if (!existsSync(outDir)) {
  console.error(`error: build output not found at ${outDir}. Run \`pnpm --filter @yieldjack/web build\` first.`);
  process.exit(1);
}

// Known mock/demo addresses from deployments/4663.json and deployments/46630.json — matched
// case-insensitively since build output may render checksummed or lowercase hex.
const KNOWN_MOCK_ADDRESSES = [
  "0x0141023b7efa2d46c0595ab5d86b27f9ba6ed58b", // MockUSDG (mainnet demo)
  "0x7f112b5aa94766c292c975bd622fc9cf930242ff", // MockJACK (mainnet demo)
  "0x0adea73eb64b0eb9e48b86880784ca06df77c665", // MockUSDG (testnet)
  "0xb91364c52ec2d8c40d4aae8891e5c93ea9632de0", // MockJACK (testnet)
];

const FORBIDDEN_LITERAL_STRINGS = [
  "MockUSDG",
  "MockJACK",
  "MockYieldSource",
  "DemoRandomnessProvider",
  "DemoPrizeEngine",
  "MainnetDemoBanner",
  "MAINNET DEMO",
  "testnet faucet",
  "simulate yield",
];

const SCANNABLE_EXTENSIONS = new Set([".html", ".js", ".css", ".json", ".txt", ".xml", ".svg", ".map"]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else if (SCANNABLE_EXTENSIONS.has(path.extname(entry))) {
      files.push(full);
    }
  }
  return files;
}

const files = walk(outDir);
const findings = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const lowerContent = content.toLowerCase();
  const relative = path.relative(repoRoot, file);

  for (const needle of FORBIDDEN_LITERAL_STRINGS) {
    if (content.includes(needle)) {
      findings.push({ file: relative, match: needle });
    }
  }

  for (const address of KNOWN_MOCK_ADDRESSES) {
    if (lowerContent.includes(address.toLowerCase())) {
      findings.push({ file: relative, match: address });
    }
  }
}

if (findings.length > 0) {
  console.error(`Production output safety scan FAILED — found ${findings.length} forbidden reference(s):\n`);
  for (const { file, match } of findings) {
    console.error(`  ${file}: "${match}"`);
  }
  console.error(`\nScanned ${files.length} files under ${path.relative(repoRoot, outDir)}.`);
  process.exit(1);
}

console.log(`Production output safety scan passed — scanned ${files.length} files under ${path.relative(repoRoot, outDir)}, found nothing.`);
