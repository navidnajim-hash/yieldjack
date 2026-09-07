# Security Policy

## Status

YieldJack is an **unaudited testnet MVP**. It runs exclusively on Robinhood Chain Testnet (and
locally on Anvil for development) using worthless mock tokens. Nothing in this repository holds
or is intended to hold real value. See [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) for what the
contracts do and don't defend against, and
[docs/PRODUCTION_ROADMAP.md](docs/PRODUCTION_ROADMAP.md) for what would need to change before
that could ever be true.

## Known, deliberate weaknesses (not bugs)

These are documented design decisions, not vulnerabilities to report:

- **`DemoRandomnessProvider` is insecure by design.** It derives randomness from a block hash,
  which is explicitly not safe for anything of real value. See its NatSpec and
  [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md#randomness-manipulation).
- **`MockYieldSource.simulateYield` lets anyone inflate the "yield" pool.** This is the intended
  mechanism for demonstrating prize growth on a testnet with no real yield venue connected.
- **Faucets are public and rate-limited only per-wallet.** They mint worthless test tokens.

## Reporting a genuine issue

If you find an actual bug — an accounting error, a way to bypass the reentrancy guard, a way for
an admin function to exceed its documented scope, or anything else that contradicts
[docs/ACCOUNTING_INVARIANTS.md](docs/ACCOUNTING_INVARIANTS.md) or
[docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) — please open an issue in this repository describing:

1. The specific invariant or documented guarantee that's violated.
2. Steps (ideally a failing Foundry test) to reproduce it.
3. The impact, given that the deployment is testnet-only with mock tokens.

Since no real value is at risk today, there is no bug-bounty program for this MVP phase. That
changes if and when a production deployment is planned — see
[docs/PRODUCTION_ROADMAP.md](docs/PRODUCTION_ROADMAP.md).

## Supported versions

Only the code on the `claude/yieldjack-testnet-mvp` branch (and its eventual merge into `main`)
is in scope. There is no long-term-support branch at this stage.
