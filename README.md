# YieldJack

**$JACK · Save. Earn. Someone wins.**

YieldJack is a prize-savings dApp: users deposit a stablecoin into a vault, the capital
generates yield, depositors keep their principal, and the yield funds a recurring prize drawn
from eligible depositors. This repository is a **working testnet MVP** — unaudited, running on
Robinhood Chain Testnet with worthless mock tokens. It is inspired by the general prize-savings
model pioneered by PoolTogether, with original branding, an original frontend, and its own
modular contract implementation (see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for why no
PoolTogether code was reused).

**Read [CLAUDE.md](CLAUDE.md) before making changes** — it records the hard safety rules this
project is built on (no fabricated addresses, no mainnet deploys, no admin-selected winners,
withdrawals always available, etc.).

## Product overview

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
  web/          Next.js frontend (static export)
  keeper/       optional TypeScript keeper (progresses draws automatically)
packages/
  contracts/    Foundry project — all Solidity source, tests, deploy scripts
  config/       shared chain definitions, deployment-manifest types, generated ABIs
deployments/    committed deployment manifests (31337.json = local Anvil, 46630.json = testnet)
docs/           architecture, threat model, accounting invariants, production roadmap
scripts/        cross-cutting Node scripts (ABI sync, manifest builder, local seed data)
.github/workflows/  CI (contract tests + frontend build, no secrets required)
```

## Prerequisites

- Node.js ≥ 20
- [pnpm](https://pnpm.io) 9.x (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`curl -L
  https://foundry.paradigm.xyz | bash && foundryup`) — make sure `~/.foundry/bin` is on your
  `PATH`

## Installation

```bash
pnpm install
pnpm contracts:build
```

## Local demo

This runs the entire system locally against Anvil, with no external RPC and no real funds.

```bash
# Terminal 1
pnpm demo:node        # starts a local Anvil node on :8545

# Terminal 2
pnpm demo:deploy       # deploys + wires all contracts, writes deployments/31337.json
pnpm demo:seed         # stages a few demo depositors at staggered times + simulated yield
pnpm dev                # starts the frontend at http://localhost:3000
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
shell. There is deliberately no equivalent script for mainnet (chain id 4663); see
[CLAUDE.md](CLAUDE.md).

## Frontend deployment / static export

`apps/web` builds to a fully static site (`output: "export"` in `next.config.mjs`) with no server
routes or middleware, so it can be uploaded to any ordinary static host:

```bash
pnpm --filter @yieldjack/web build
# static output is now in apps/web/out/ — upload it as-is
```

If your host doesn't automatically resolve `/foo` to `/foo.html`, add `trailingSlash: true` to
`next.config.mjs` and rebuild.

## Keeper (optional)

Progresses draws automatically by calling the same permissionless functions any user could call
from the app — see [apps/keeper](apps/keeper). Not required: eligible users can always advance a
round themselves via the frontend's testnet controls.

```bash
cd apps/keeper
cp .env.example .env   # DRY_RUN=true by default — logs actions without sending transactions
pnpm start
```

## Environment variables

| File | Variable | Purpose |
| --- | --- | --- |
| `apps/web/.env.example` | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional; falls back to injected-wallet-only connectors if unset |
| `apps/keeper/.env.example` | `KEEPER_NETWORK`, `ROBINHOOD_TESTNET_RPC_URL`, `KEEPER_PRIVATE_KEY`, `DRY_RUN`, `POLL_INTERVAL_MS` | See file for details |
| (shell, not committed) | `DEPLOYER_PRIVATE_KEY` | Read by the Foundry deploy scripts; never hardcoded |

## Local commands reference

```bash
pnpm install
pnpm contracts:build      # forge build + sync generated ABIs into packages/config
pnpm contracts:test       # forge test — unit, fuzz, and invariant suites
pnpm demo:node             # local Anvil node
pnpm demo:deploy           # deploy + wire contracts, write deployments/31337.json
pnpm demo:seed              # stage demo participants + simulated yield
pnpm dev                    # frontend dev server
pnpm web:lint / web:typecheck / web:test / web:build / web:e2e
```

## Known limitations

This is a testnet MVP. See [docs/PRODUCTION_ROADMAP.md](docs/PRODUCTION_ROADMAP.md) for the full,
itemized list; the headline items:

- `MockUSDG`, `MockJACK`, `MockYieldSource`, and `DemoRandomnessProvider` are all testnet-only
  mocks with no real-world value or security guarantees.
- The active-participant set is capped at 256 wallets (`YieldJackVault.MAX_PARTICIPANTS`).
- Nothing in this repository has been professionally audited.
- No fees or token buybacks are implemented (deliberately — see the original spec this MVP was
  built against).

## Exact next steps toward production

See [docs/PRODUCTION_ROADMAP.md](docs/PRODUCTION_ROADMAP.md) for the full list: replace every
mock component with a verified real equivalent, decide on PoolTogether-component reuse vs.
independent audit of this codebase's own modules, get an independent smart-contract audit, run
mainnet fork tests, move to multisig administration, launch with a TVL-capped beta, stand up
monitoring/incident response, and get legal review before any real-money launch.
