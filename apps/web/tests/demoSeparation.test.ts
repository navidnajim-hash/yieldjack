import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Deliberately just the banner-identifying strings, not the full mock-contract-name list from
// the build-output safety scan (scripts/production-output-safety-scan.mjs) — this app's own
// source legitimately *names* those mock contracts in `lib/production/knownDemoAddresses.ts`,
// as comments documenting exactly which addresses its guard list rejects. That is the opposite
// of importing or rendering them, so it must not trip this test.
const FORBIDDEN_STRINGS = ["MainnetDemoBanner", "MAINNET DEMO"];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else if (/\.(ts|tsx|css)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe("the production app never renders the demo's mainnet warning banner", () => {
  it("no file under apps/web/src references MainnetDemoBanner or MAINNET DEMO copy", () => {
    const srcRoot = path.resolve(__dirname, "../src");
    const offenders: { file: string; match: string }[] = [];

    for (const file of walk(srcRoot)) {
      const content = readFileSync(file, "utf8");
      for (const needle of FORBIDDEN_STRINGS) {
        if (content.includes(needle)) offenders.push({ file, match: needle });
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("the demo app still carries its unconditional mainnet-demo warning", () => {
  it("apps/demo-web's root layout mounts MainnetDemoBanner", () => {
    const demoLayoutPath = path.resolve(__dirname, "../../demo-web/src/app/layout.tsx");
    const content = readFileSync(demoLayoutPath, "utf8");
    expect(content).toContain("MainnetDemoBanner");
  });

  it("apps/demo-web's MainnetDemoBanner component still exists and is unconditional on demo status", () => {
    const bannerPath = path.resolve(__dirname, "../../demo-web/src/components/shared/MainnetDemoBanner.tsx");
    const content = readFileSync(bannerPath, "utf8");
    expect(content).toMatch(/MAINNET DEMO/);
    expect(content).toContain("export function MainnetDemoBanner");
  });
});
