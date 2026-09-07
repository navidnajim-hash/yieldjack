# YieldJack

**$JACK · Save. Earn. Someone wins.**

YieldJack is a prize-savings dApp: users deposit a stablecoin into a vault, the capital
generates yield, depositors keep their principal, and the yield funds a recurring prize drawn
from eligible depositors. It is inspired by the general prize-savings model pioneered by
PoolTogether, with original branding, an original frontend, and its own modular contract
implementation (see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for why no PoolTogether code
was reused).

This repository contains **two separate frontend applications** (see
[Repository structure](#repository-structure)):

- **`apps/web`** — the **production** interface at [yieldjack.fun](https://yieldjack.fun),
  deployed from this repo's `main` branch. It never resolves or calls the mock/testnet
  contracts below, carries no demo/trial/testnet banner, and keeps every transaction control
  disabled until the real, audited `$JACK` token and YieldJack contracts it needs are deployed
  and configured in [`deployments/production/4663.json`](deployments/production/4663.json) —
  which today is entirely `null` (`"status": "prelaunch"`). Real `$JACK` fee-routing/staking
  contracts (`JackFeeRouter`, `JackStakingRewards` — see
  [packages/contracts/src/fees](packages/contracts/src/fees) and
  [packages/contracts/src/staking](packages/contracts/src/staking)) exist and are tested, but
  have not been deployed anywhere yet, and there is no production savings vault yet either.
- **`apps/demo-web`** — a **working testnet MVP**: unaudited, running on Robinhood Chain
  Testnet (and a mock-only mainnet demo) with worthless mock tokens. This is the original demo
  application this project started as; it always displays its `MainnetDemoBanner` warning and
  must never be confused with the production interface.

**Read [CLAUDE.md](CLAUDE.md) before making changes** — it records the hard safety rules this
project is built on (no fabricated addresses, no mainnet deploys, no admin-selected winners,
withdrawals always available, strict separation between the two frontend apps, etc.).

## Product overview (testnet MVP — `apps/demo-web`)

A round runs for a configured duration. During it, users can deposit and withdraw Mock USDG
freely — their principal is always theirs. Deposited capital is routed into a yield source;
realized yield (never principal) becomes that round's prize, optionally topped up by anyone
sponsoring a bonus prize with Mock USDG (burning Mock JACK to do so). When the round ends, anyone
can close it, request on-chain randomness, and finalize a winner — weighted by how much each
depositor held and for how long. The winner claims the prize; unclaimed prizes roll forward
rather than being lost.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system diagram and per-contract
responsibilities. In short: `YieldJackVault` (custody + time-weighted eligibility) routes
deposits into `MockYieldSource` (a mock ERC-4626 yield venue); `DemoPrizeEngine` runs the
permissionless draw lifecycle against `DemoRandomnessProvider` (explicitly insecure demo
randomness); `SponsorRegistry` lets anyone add a JACK-burn-funded bonus prize. Every number the
frontend shows is a live read against these contracts — see
[docs/ACCOUNTING_INVARIANTS.md](docs/ACCOUNTING_INVARIANTS.md) for exactly how principal, yield,
and prize accounting are kept separate, and [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) for what
is and isn't defended against.

## Repository structure

```
apps/
  web/          Production Next.js frontend (static export) — yieldjack.fun, deployed by Vercel
  demo-web/     Testnet/mainnet-demo Next.js frontend (static export) — the original demo MVP
  keeper/       optional TypeScript keeper (progresses demo-web's draws automatically)
packages/
  contracts/    Foundry project — all Solidity source, tests, deploy scripts
  config/       shared chain definitions, demo deployment-manifest types, generated ABIs
deployments/
  31337.json / 46630.json / 4663.json   demo-web's manifests (local Anvil / testnet /
                                          Robinhood Chain mainnet mock-only demo)
  production/4663.json                   apps/web's production manifest — all-null until real
                                          contracts are deployed (see below)
docs/           architecture, threat model, accounting invariants, production roadmap
scripts/        cross-cutting Node scripts (ABI sync, manifest builder, local seed data,
                 production build-output safety scan)
.github/workflows/  CI (contract tests + both frontend apps' build/test/e2e, no secrets required)
```

## Prerequisites

- Node.js ≥ 20
- [pnpm](https://pnpm.io) 9.x (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`curl -L
  https://foundry.paradigm.xyz | bash && foundryup`) — make sure `~/.foundry/bin` is on your
  `PATH`

## Installation

Contract dependencies (OpenZeppelin, forge-std) are pinned git submodules, not vendored files —
if you haven't already, fetch them once:

```bash
git submodule update --init --recursive   # or: git clone --recurse-submodules <this repo>
```

Then:

```bash
pnpm install
pnpm contracts:build
```

## Local demo (`apps/demo-web`)

This runs the entire testnet-MVP system locally against Anvil, with no external RPC and no real
funds.

```bash
# Terminal 1
pnpm demo:node        # starts a local Anvil node on :8545

# Terminal 2
pnpm demo:deploy       # deploys + wires all contracts, writes deployments/31337.json
pnpm demo:seed         # stages a few demo depositors at staggered times + simulated yield
pnpm demo-web:dev      # starts the demo frontend at http://localhost:3000
```

Open `http://localhost:3000`, connect a wallet pointed at `http://127.0.0.1:8545` (chain id
`31337`), and import one of the seed script's printed demo-participant private keys (or use your
own — the deployer account `0xf39F...2266`, Anvil's default account #0, is pre-funded with test
ETH and can call the faucets itself) to try the full flow: faucet → deposit → watch the prize/
weight update → use the testnet controls to close the round → fulfil randomness → finalize →
claim.

`pnpm demo:seed` deliberately leaves the round **open** rather than pre-completing it, so you can
drive the rest of the lifecycle interactively from the app's testnet-only demo controls (or via
the optional keeper — see below).

## Testnet deployment (Robinhood Chain Testnet)

```bash
export DEPLOYER_PRIVATE_KEY=0x...      # your own funded testnet key — never paste it into chat
export ROBINHOOD_TESTNET_RPC_URL=https://rpc.testnet.chain.robinhood.com   # default if unset
pnpm --filter @yieldjack/contracts deploy:testnet
node scripts/build-deployment-manifest.mjs 46630
```

This repository never asks for or transmits a private key on your behalf — export it in your own
shell, and it is read from the environment *inside* the Foundry script (`vm.envUint`), never
passed as a `--private-key` command-line argument, so it never ends up in shell history or a
process listing.

### Mainnet demo deployment (Robinhood Chain mainnet, chain id 4663)

This is **not** a production deployment. `deploy:mainnet-demo` deploys the exact same worthless
mock suite as testnet — MockUSDG, MockJACK, MockYieldSource, DemoRandomnessProvider — to
Robinhood Chain mainnet, purely so the app can be demoed there. See
[CLAUDE.md](CLAUDE.md) for the narrow carve-out that permits this one script, and
[docs/PRODUCTION_ROADMAP.md](docs/PRODUCTION_ROADMAP.md) for everything a real deployment would
still need.

```bash
export DEPLOYER_PRIVATE_KEY=0x...      # your own funded mainnet key — never paste it into chat
export ROBINHOOD_MAINNET_RPC_URL=...   # no default — you must set this yourself
export MAINNET_DEMO_ACK=I_UNDERSTAND_THIS_IS_MOCK_ONLY

# Dry run (no --broadcast): simulates the deploy and prints what would happen, sends nothing.
pnpm --filter @yieldjack/contracts deploy:mainnet-demo

# Only once you've reviewed the dry run: actually broadcast, by passing --broadcast yourself.
pnpm --filter @yieldjack/contracts deploy:mainnet-demo -- --broadcast

node scripts/build-deployment-manifest.mjs 4663
```

Unlike `deploy:testnet`, `deploy:mainnet-demo` never bakes `--broadcast` into the package script
itself — a human has to add it explicitly, every time, on top of setting `MAINNET_DEMO_ACK`.

### Contract verification (separate, optional step)

Verification is **not** part of the default deploy command — it needs Blockscout-specific
variables this repo has no way to confirm ahead of time, so attempting it unconditionally would
just fail silently for anyone who hasn't set them up. Once you've confirmed the right invocation
against `https://explorer.testnet.chain.robinhood.com`, verify a deployed contract manually:

```bash
forge verify-contract \
  --rpc-url $ROBINHOOD_TESTNET_RPC_URL \
  --verifier blockscout \
  --verifier-url https://explorer.testnet.chain.robinhood.com/api \
  <deployed-address> <path/to/Contract.sol>:<ContractName>
```

Repeat per contract, using the addresses from `deployments/46630.json` after deploying.

## Production frontend (`apps/web`)

`apps/web` is the production interface at [yieldjack.fun](https://yieldjack.fun) — this is what
Vercel builds from `main`. It is visually and structurally complete today, but every transaction
control (deposit/withdraw/claim on Save & Win; stake/unstake/claim on Stake JACK) stays disabled
until the contracts it needs are real, deployed, and configured. There is no environment-variable
override for any of this: contract addresses are public configuration, and
[`deployments/production/4663.json`](deployments/production/4663.json) is their single committed
source of truth.

To activate a feature once its contracts are deployed and verified, add the real addresses to
`deployments/production/4663.json` — never invent or guess one. `apps/web`'s production resolver
(`apps/web/src/lib/production/`) requires *every* address a feature needs before enabling that
feature's controls (see CLAUDE.md's "Two frontend applications" section), and additionally
verifies on-chain bytecode exists at each configured address before allowing a write.

```bash
pnpm --filter @yieldjack/web dev     # local dev server at http://localhost:3000
pnpm --filter @yieldjack/web build   # static export to apps/web/out/
node scripts/production-output-safety-scan.mjs   # fails if any mock/demo trace is in the output
```

Both `apps/web` and `apps/demo-web` build to a fully static site (`output: "export"` in each
app's `next.config.mjs`) with no server routes or middleware, so either can be uploaded to any
ordinary static host. If your host doesn't automatically resolve `/foo` to `/foo.html`, add
`trailingSlash: true` to the relevant `next.config.mjs` and rebuild.

## Keeper (optional)

Progresses `apps/demo-web`'s draws automatically by calling the same permissionless functions any
user could call from that app — see [apps/keeper](apps/keeper). Not required: eligible users can
always advance a round themselves via the demo frontend's testnet controls. Not applicable to
`apps/web`, which has no production vault to progress yet.

```bash
cd apps/keeper
cp .env.example .env   # DRY_RUN=true by default — logs actions without sending transactions
pnpm start
```

## Environment variables

| File | Variable | Purpose |
| --- | --- | --- |
| `apps/web/.env.example` | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional; falls back to injected-wallet-only connectors if unset |
| `apps/demo-web/.env.example` | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Same, for the demo app |
| `apps/keeper/.env.example` | `KEEPER_NETWORK`, `ROBINHOOD_TESTNET_RPC_URL`, `KEEPER_PRIVATE_KEY`, `DRY_RUN`, `POLL_INTERVAL_MS` | See file for details |
| (shell, not committed) | `DEPLOYER_PRIVATE_KEY` | Read by the Foundry deploy scripts; never hardcoded |
| (shell, not committed) | `ROBINHOOD_MAINNET_RPC_URL` | Robinhood Chain mainnet RPC; only used by `deploy:mainnet-demo` |
| (shell, not committed) | `MAINNET_DEMO_ACK` | Must equal `I_UNDERSTAND_THIS_IS_MOCK_ONLY`; required by `DeployMainnetDemo.s.sol` |

Neither frontend app has a backend, a database, or any server-side secret — every address either
app reads is public configuration committed to this repository.

## Local commands reference

```bash
pnpm install
pnpm contracts:build      # forge build + sync generated ABIs into packages/config
pnpm contracts:test       # forge test — unit, fuzz, and invariant suites
pnpm demo:node             # local Anvil node
pnpm demo:deploy           # deploy + wire contracts, write deployments/31337.json
pnpm demo:seed              # stage demo participants + simulated yield
pnpm dev                    # production frontend dev server (apps/web)

pnpm web:lint / web:typecheck / web:test / web:build / web:e2e / web:safety-scan
pnpm demo-web:dev / demo-web:lint / demo-web:typecheck / demo-web:test / demo-web:build / demo-web:e2e
```

## Known limitations

- **`apps/web` (production):** no contract has been deployed yet — see
  [`deployments/production/4663.json`](deployments/production/4663.json). `JackFeeRouter` and
  `JackStakingRewards` exist and are tested in `packages/contracts/src/{fees,staking}`, but are
  not deployed anywhere; there is no production savings vault or prize engine yet; `$JACK` itself
  has not launched. Nothing in this repository has been professionally audited.
- **`apps/demo-web` (testnet MVP):** see [docs/PRODUCTION_ROADMAP.md](docs/PRODUCTION_ROADMAP.md)
  for the full, itemized list; the headline items:
  - `MockUSDG`, `MockJACK`, `MockYieldSource`, and `DemoRandomnessProvider` are all testnet-only
    mocks with no real-world value or security guarantees.
  - The active-participant set is capped at 256 wallets (`YieldJackVault.MAX_PARTICIPANTS`).
  - No fees or token buybacks are implemented in the demo (deliberately — see the original spec
    this MVP was built against).

## Exact next steps toward production

See [docs/PRODUCTION_ROADMAP.md](docs/PRODUCTION_ROADMAP.md) for the full list: replace every
mock component with a verified real equivalent, decide on PoolTogether-component reuse vs.
independent audit of this codebase's own modules, get an independent smart-contract audit, run
mainnet fork tests, move to multisig administration, launch with a TVL-capped beta, stand up
monitoring/incident response, and get legal review before any real-money launch.
