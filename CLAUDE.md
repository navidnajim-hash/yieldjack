# Engineering rules for this repository

Permanent rules for anyone (human or AI) working on YieldJack. These are not suggestions — they
were specified as hard constraints for this project and several are safety-critical.

## Absolute rules

- **Never fabricate addresses or integrations.** Never invent a token, vault, oracle, Morpho
  market, randomness provider, or protocol contract address. Every address in this repository
  either comes from `deployments/<chainId>.json` (written by the deploy pipeline, never
  hand-typed) or is one of the two explicitly documented, spec-provided addresses (Robinhood
  Chain Testnet/mainnet chain config, canonical mainnet USDG). If a real integration doesn't
  exist yet, say so — don't guess an address.
- **Never deploy anything but the mock-only mainnet demo to mainnet.** The sole exception to
  "never deploy to mainnet" is `script/DeployMainnetDemo.s.sol`, which deploys the exact same
  MockUSDG / MockJACK / MockYieldSource / DemoRandomnessProvider suite used on testnet —
  unchanged — to Robinhood Chain mainnet (chain id 4663), gated by a chain-id check and a
  mandatory `MAINNET_DEMO_ACK` acknowledgement, and never broadcast by any automation in this
  repository (a human runs it locally, with their own key, and must pass `--broadcast`
  explicitly). This is a narrow, explicit carve-out — not a general permission to add other
  mainnet scripts or to loosen this rule further. It remains an absolute, non-negotiable rule
  that nothing in this repository may ever:
    - accept, integrate, or transact with canonical USDG (`CANONICAL_MAINNET_USDG` stays
      documentation-only — never a constructor argument, never used in a live transaction);
    - present mJACK as, or allow it to be confused with, the real `$JACK` token;
    - add liquidity for mUSDG or mJACK on any DEX, market, or bridge, on any chain;
    - remove, weaken, or make conditional-in-a-way-that-could-silently-fail any "MAINNET DEMO" /
      "Mock" / "Demo" warning shown to a user — see `apps/demo-web`'s `MainnetDemoBanner`,
      mounted unconditionally in that app's root layout precisely so no page can drop it by
      omission;
    - deploy a real-value version of this system (real USDG, a real yield integration,
      production-grade randomness, or anything beyond a single-EOA demo admin) without the
      independent audit and every other step in `docs/PRODUCTION_ROADMAP.md`.
  See `packages/config/src/chains.ts` and `docs/PRODUCTION_ROADMAP.md` for more.
- **`apps/web` (the production interface) may never resolve or call mock contracts.** It must
  never import `deployments/4663.json`, `deployments/31337.json`, `deployments/46630.json`, or
  anything from `apps/demo-web` — its production deployment resolver
  (`apps/web/src/lib/production/`) reads only the committed
  `deployments/production/4663.json` manifest, described below. A missing or not-yet-verified
  production address must disable the transaction controls that depend on it — it must never be
  filled in with a guess, an environment variable, or a fallback to a mock/testnet address. See
  "Two frontend applications" below.
- **Never commit secrets.** No private key, API key, or credential belongs in this repository.
  `.env.example` files list variable *names* only. Deployment scripts read credentials from the
  environment (`DEPLOYER_PRIVATE_KEY`, `KEEPER_PRIVATE_KEY`) — never hardcode a real one. The
  well-known Anvil default test key used for *local-only* scripts (`0xac09...2ff80`) is public,
  standard tooling convention, not a secret, and must never be used against a real network.
- **Withdrawals remain available during administrative pause.** `YieldJackVault.pause()` must
  only ever gate `deposit` (and, transitively, `DemoPrizeEngine.closeRound`, i.e. new draw
  creation) — never `withdraw`. If you find yourself adding a `whenNotPaused` modifier to
  `withdraw`, stop; that's the one thing this system must never do.
- **Principal does not fund prizes.** `DemoPrizeEngine.prizeAmount` may only ever be increased by
  `YieldJackVault.pullYield` (realized yield, itself computed as
  `vaultAssets - totalPrincipal`, never including principal) or by `SponsorRegistry`. There must
  never be a code path where a user's `principal[user]` balance can end up smaller than what they
  deposited minus what they withdrew.
- **Admin cannot choose winners.** No function, anywhere, may let an address set or override a
  round's `winner`. Winner selection is a pure function of the randomness value and the weight
  snapshot taken at close.
- **No unbounded participant loops.** Every loop over depositors (`snapshotAndReset`,
  `previewAllWeights`, winner selection in `finalize`) is bounded by
  `YieldJackVault.MAX_PARTICIPANTS` (256). This is an explicit testnet-only limitation (see
  `docs/PRODUCTION_ROADMAP.md`) — don't remove the cap without replacing the underlying data
  structure.

## Two frontend applications

This repository ships two separate Next.js apps under `apps/`, deliberately kept apart so a
production-facing change can never accidentally weaken or drop the demo's safety warnings, and so
the demo's mock contracts can never leak into the production interface:

- **`apps/demo-web`** (package `@yieldjack/demo-web`) is the mock/testnet/mainnet-demo interface.
  It resolves `deployments/31337.json`, `deployments/46630.json`, and `deployments/4663.json`
  (the mock-only mainnet demo — see above), and its root layout mounts `MainnetDemoBanner`
  unconditionally. It must always display that warning, keep its faucets/testnet-controls/
  simulated-yield features clearly labeled, and must never be presented as, or confused with, a
  production deployment.
- **`apps/web`** (package `@yieldjack/web`) is the production interface, and the one
  Vercel builds and deploys. It has its own root layout with **no** demo/trial/testnet banner —
  see "Absolute rules" for why a real production interface must not carry demo-only warnings —
  and its own production deployment resolver at `apps/web/src/lib/production/`, which:
    - reads only the committed `deployments/production/4663.json` manifest (see
      "Production deployment manifest" below) — never `deployments/4663.json` or any other
      demo/testnet manifest;
    - validates every address it reads (well-formed, non-zero, and not one of the known demo/mock
      addresses — see `apps/web/src/lib/production/knownDemoAddresses.ts`) before treating it as
      configured;
    - requires *every* contract a feature needs (see `FEATURE_REQUIREMENTS` in
      `apps/web/src/lib/production/types.ts`) before enabling that feature's transaction
      controls — a single configured address can never make a feature "half-live";
    - treats an RPC/read failure, or bytecode that doesn't exist at a configured address (see
      `useContractLiveness`), as "not ready," never as permission to write.

  When you touch `apps/web`, never import `@/lib/deployments`, `deployments/4663.json`,
  `deployments/31337.json`, `deployments/46630.json`, or anything under `apps/demo-web` — this is
  checked by `apps/web/tests/productionResolver.test.ts` and
  `apps/web/tests/demoSeparation.test.ts`.

### Production deployment manifest

`deployments/production/4663.json` is the single source of truth for every production contract
address (`jackToken`, `jackFeeRouter`, `jackStakingRewards`, `prizeReserve`, `productionVault`,
`productionPrizeEngine`, `productionAsset`) and the `jackTradeUrl` link. It starts, and must stay,
all-`null` with `"status": "prelaunch"` until a real contract is deployed and verified — never
fill in a placeholder or guessed value. Contract addresses are public configuration, not secrets:
this committed file is the source of truth, not a hidden environment variable.

### Production build-output safety scan

`scripts/production-output-safety-scan.mjs` (run in CI against `apps/web/out`, after
`pnpm --filter @yieldjack/web build`) fails the build if the production app's shipped output ever
contains a known mock/demo contract name, a known mJACK/mUSDG address, `MainnetDemoBanner`,
"MAINNET DEMO", "testnet faucet", or "simulate yield". This scan does **not** run against
`apps/demo-web/out` — those terms correctly belong there. Because of this scan,
`apps/web/src/lib/production/knownDemoAddresses.ts` deliberately stores hashes of the known
demo/mock addresses, never the literal address strings — see that file's comments before adding
any new literal address anywhere under `apps/web/src`.

## Workflow rules

- **Run tests after contract changes.** `pnpm contracts:test` (which runs unit, fuzz, and
  invariant tests) must pass before considering a Solidity change done. The invariant suite in
  particular has caught real bugs during this project's own development (an ERC-4626
  share-inflation vector, and a rounding edge case that could trap a withdrawal) — don't treat it
  as optional.
- **Run lint, typecheck and build after frontend changes.** For a change under `apps/web`, run
  `pnpm --filter @yieldjack/web lint`, `typecheck`, `test`, and `build`, then
  `node scripts/production-output-safety-scan.mjs` against the fresh build output. For a change
  under `apps/demo-web`, run the equivalent `pnpm --filter @yieldjack/demo-web ...` commands. The
  build in particular has caught real issues (a broken transitive dependency chain, an ESLint
  config gap) that lint/typecheck alone didn't.
- **Clearly distinguish demo components from production components.** Every contract, function,
  or UI element that only exists for the testnet demo (`simulateYield`, faucets, the testnet
  controls panel, `DemoRandomnessProvider`'s insecurity) must say so in its NatSpec/comments and,
  where user-facing, in the UI itself. Never let a "Demo"/"Mock"/"testnet-only" label get
  dropped during a refactor. This applies to `apps/demo-web` only — `apps/web` must never carry
  one of these labels at all, because it must never be running against a mock contract in the
  first place.

## Where to look

- `docs/ARCHITECTURE.md` — system design and contract responsibilities.
- `docs/ACCOUNTING_INVARIANTS.md` — precise definitions of principal/yield/prize accounting and
  the invariants the contracts hold.
- `docs/THREAT_MODEL.md` — what each contract does and doesn't defend against.
- `docs/PRODUCTION_ROADMAP.md` — everything that must change before real value could ever touch
  this system.
- `THIRD_PARTY_NOTICES.md` — licensing and design-inspiration attribution (PoolTogether V5,
  OpenZeppelin, forge-std).
- `deployments/production/4663.json` — the production contract-address manifest (see
  "Two frontend applications" above).
- `apps/web/src/lib/production/` — the production deployment resolver: manifest parsing/address
  validation (`manifest.ts`), feature readiness (`resolver.ts`), and the known-demo-address guard
  (`knownDemoAddresses.ts`).
- `scripts/production-output-safety-scan.mjs` — the CI check that fails the production build if
  any mock/demo trace ends up in `apps/web/out`.
