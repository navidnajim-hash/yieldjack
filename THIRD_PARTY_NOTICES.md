# Third-Party Notices

This document records every third-party dependency this repository depends on (as pinned git
submodules, not vendored/committed source) or whose design materially influenced YieldJack's
own code, per the project's engineering rules (see [CLAUDE.md](CLAUDE.md)).

## Code dependencies (pinned git submodules)

| Component | License | Version pinned | Where |
| --- | --- | --- | --- |
| [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) | MIT | `v5.7.0` | `packages/contracts/lib/openzeppelin-contracts` |
| [forge-std](https://github.com/foundry-rs/forge-std) | MIT / Apache-2.0 | `v1.16.2` | `packages/contracts/lib/forge-std` |

Both are pinned as git submodules (see `.gitmodules`) at the exact tag noted above — not
committed as plain files — imported via Foundry's standard `lib/` mechanism and
`remappings.txt`, used as-is with no source modification. Their own LICENSE files ship inside
each submodule. Run `git submodule update --init --recursive` after cloning (see README.md).

## Design inspiration — not code reuse

YieldJack's prize-savings model is inspired by [PoolTogether V5](https://dev.pooltogether.com/),
specifically the general architecture described across:

- [pt-v5-vault](https://github.com/GenerationSoftware/pt-v5-vault) — MIT license
- [pt-v5-prize-pool](https://github.com/GenerationSoftware/pt-v5-prize-pool) — MIT license
- [pt-v5-twab-controller](https://github.com/GenerationSoftware/pt-v5-twab-controller) — MIT
  license
- [pt-v5-testnet](https://github.com/GenerationSoftware/pt-v5-testnet)
- PoolTogether's [vault](https://dev.pooltogether.com/protocol/design/vaults/),
  [TWAB controller](https://dev.pooltogether.com/protocol/design/twab-controller/), and
  [draw auction](https://dev.pooltogether.com/protocol/design/draw-auction/) design docs

**No source code from these repositories is copied into this project.** This was a deliberate
decision, documented here per the project's "never fabricate... its own modular implementation"
rule (see the spec this MVP was built against, and [CLAUDE.md](CLAUDE.md)):

- The task explicitly required original branding, an original frontend, and "its own modular
  implementation" rather than a fork.
- PoolTogether V5's actual TWAB controller supports arbitrary historical balance queries via a
  ring-buffer of checkpoints — considerably more machinery than this MVP needs, since
  `DemoPrizeEngine` only ever needs "weight since the current round opened." `YieldJackVault`
  instead uses a simpler per-round weight accumulator (see
  [docs/ACCOUNTING_INVARIANTS.md](docs/ACCOUNTING_INVARIANTS.md)) that is original code, easier
  to audit for this scope, and not a derivative of PoolTogether's implementation.
- PoolTogether V5's draw mechanism is a two-stage Parabolic-Fractional-Dutch-Auction incentive
  system funded by a prize-pool reserve. `DemoPrizeEngine` instead makes every lifecycle
  transition (`closeRound`, `finalize`, `rollover`) plainly permissionless with no auction —
  simpler, and appropriate for a testnet MVP where gas-incentive design isn't the point being
  demonstrated.

Despite no code being reused, both licenses above are confirmed MIT, so reuse would have been
legally permissive if a future iteration chooses to adopt an actual PoolTogether module —
see [docs/PRODUCTION_ROADMAP.md](docs/PRODUCTION_ROADMAP.md).

### Recorded fact from PoolTogether's own documentation

The `pt-v5-prize-pool` repository states that **only WETH has been audited as the `prizeToken`**
for its prize pool; other tokens may introduce unknown precision or rounding complications. This
project does not use any PoolTogether prize-pool code, but the fact is recorded here (and
repeated on the Transparency page) because it is directly relevant context: this MVP's own
`MockUSDG` prize asset has *not* been audited by anyone, and no claim to the contrary should ever
be made about it or about any future production configuration.

## Branding

YieldJack's wordmark, symbol (`apps/web/src/components/layout/Logo.tsx`), color palette, and
copy are original to this project. No PoolTogether or Robinhood branding, logos, or trademarked
assets are used anywhere in this repository.

## Frontend runtime dependencies

Frontend dependencies (Next.js, React, wagmi, viem, RainbowKit, TanStack Query, Tailwind CSS,
etc.) are standard open-source packages installed via npm/pnpm under their own OSI-approved
licenses (MIT/Apache-2.0/ISC per each package). See `apps/web/package.json`,
`apps/keeper/package.json`, and `pnpm-lock.yaml` for the exact, pinned versions in use.
