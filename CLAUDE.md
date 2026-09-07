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
      "Mock" / "Demo" warning shown to a user — see `MainnetDemoBanner`, mounted unconditionally
      in the root layout precisely so no page can drop it by omission;
    - deploy a real-value version of this system (real USDG, a real yield integration,
      production-grade randomness, or anything beyond a single-EOA demo admin) without the
      independent audit and every other step in `docs/PRODUCTION_ROADMAP.md`.
  See `packages/config/src/chains.ts` and `docs/PRODUCTION_ROADMAP.md` for more.
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

## Workflow rules

- **Run tests after contract changes.** `pnpm contracts:test` (which runs unit, fuzz, and
  invariant tests) must pass before considering a Solidity change done. The invariant suite in
  particular has caught real bugs during this project's own development (an ERC-4626
  share-inflation vector, and a rounding edge case that could trap a withdrawal) — don't treat it
  as optional.
- **Run lint, typecheck and build after frontend changes.** `pnpm --filter @yieldjack/web lint`,
  `typecheck`, and `build` (the static export) must all pass. The build in particular has caught
  real issues (a broken transitive dependency chain, an ESLint config gap) that lint/typecheck
  alone didn't.
- **Clearly distinguish demo components from production components.** Every contract, function,
  or UI element that only exists for the testnet demo (`simulateYield`, faucets, the testnet
  controls panel, `DemoRandomnessProvider`'s insecurity) must say so in its NatSpec/comments and,
  where user-facing, in the UI itself. Never let a "Demo"/"Mock"/"testnet-only" label get
  dropped during a refactor.

## Where to look

- `docs/ARCHITECTURE.md` — system design and contract responsibilities.
- `docs/ACCOUNTING_INVARIANTS.md` — precise definitions of principal/yield/prize accounting and
  the invariants the contracts hold.
- `docs/THREAT_MODEL.md` — what each contract does and doesn't defend against.
- `docs/PRODUCTION_ROADMAP.md` — everything that must change before real value could ever touch
  this system.
- `THIRD_PARTY_NOTICES.md` — licensing and design-inspiration attribution (PoolTogether V5,
  OpenZeppelin, forge-std).
