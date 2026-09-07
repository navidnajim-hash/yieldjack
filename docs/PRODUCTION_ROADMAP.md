# Production Roadmap

This testnet MVP is not production software. Nothing in this repository should be deployed to
Robinhood Chain mainnet, and no script here is even capable of broadcasting there (see
[CLAUDE.md](../CLAUDE.md)). This document lists what a real production deployment still needs,
roughly in the order it would need doing.

## 1. Replace every mock component

- **`MockUSDG` → canonical USDG.** The real, canonical mainnet USDG address is
  `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` (documented, never used in a live transaction by
  this repo). Before reusing this MVP's accounting model unmodified against it: verify USDG has
  no fee-on-transfer or rebasing behavior (see
  [THREAT_MODEL.md](THREAT_MODEL.md#malicious-tokens)), and confirm its actual decimals (this MVP
  assumes 6, matching the documented convention).
- **`MockYieldSource` → a real, verified ERC-4626 USDG yield source.** This is the single
  highest-leverage change. Requirements: an independent security review of that specific vault
  (not just of YieldJack's own contracts), a live monitoring plan for its solvency (see
  [THREAT_MODEL.md](THREAT_MODEL.md#yield-source-loss)), and a documented decision on which real
  venue (a specific Morpho market, a specific Steakhouse-curated vault, or otherwise) — this MVP
  deliberately never connects to one, per its own constraints.
- **`DemoRandomnessProvider` → production-grade verifiable randomness.** A VRF (e.g. Chainlink
  VRF or an equivalent verifiable-randomness service available on Robinhood Chain) implementing
  `IRandomnessProvider` — no change to `DemoPrizeEngine` should be required if the interface
  contract is honored.
- **`MockJACK` → the real `$JACK` token**, once it exists. `SponsorRegistry`'s `jack` reference
  is a constructor parameter, not hardcoded, specifically so this is a redeploy-and-repoint
  rather than a code change.

## 2. Decide the architecture question this MVP deliberately deferred

Choose between adopting audited PoolTogether V5 components directly (MIT-licensed, so legally
available — see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)) versus continuing with
YieldJack's own simpler, original modules under independent audit. This is a real engineering
trade-off (PoolTogether's TWAB controller and draw-auction system are considerably more capital-
and audit-hours-proven; YieldJack's own modules are simpler and easier to reason about but
unaudited) that should be made deliberately, not by default.

## 3. Independent smart-contract audit

Every contract in `packages/contracts/src/` — not just the ones this document flags — needs a
professional audit before holding real value. Pay particular attention to the areas the
invariant fuzzer already flagged issues in during development (ERC-4626 rounding and share-price
manipulation — see [ACCOUNTING_INVARIANTS.md](ACCOUNTING_INVARIANTS.md)), since that pattern
class is exactly what audits look for.

## 4. Mainnet fork tests

Before any mainnet deployment, run the full test suite (or an equivalent) against a fork of
Robinhood Chain mainnet with the real USDG contract and the real chosen yield venue, not just
against local mocks.

## 5. Multisig administration

Replace the single EOA `owner` on every contract with a multisig (and consider a timelock on the
narrow admin functions that remain — see
[THREAT_MODEL.md](THREAT_MODEL.md#administrator-compromise) for exactly what those are).

## 6. TVL-capped beta

Launch with `YieldJackVault.depositCap` set low and raise it deliberately as confidence builds —
the cap mechanism already exists in this MVP; production just needs a real rollout policy around
it.

## 7. Monitoring and incident response

Live alerting on: yield-source solvency, unusual `simulateYield`-equivalent activity (the
production yield source obviously won't have this function, but its analogue — unexpectedly
large yield reported in one block — deserves the same suspicion), stuck rounds, and any owner-key
admin action. Write and rehearse an incident-response runbook before launch.

## 8. Legal review

Prize-linked savings products are a regulated space in many jurisdictions. Get legal review
specifically on: availability (which jurisdictions can participate), marketing language (this
MVP is careful never to show fabricated APY or guaranteed-return language — production marketing
must hold the same line), and how sponsorship/`$JACK` utility is characterized.

## 9. Remove every testnet-only limitation

Once the above is done, these testnet-only constraints (all explicitly labeled as such in code,
UI, and docs) need a real production answer, not just removal:

- `MAX_PARTICIPANTS = 256` bounded active-depositor set (`YieldJackVault`) — needed today to
  bound loop gas costs on a simple array; production needs either a genuinely unbounded
  data structure or a deliberately-chosen, monitored cap.
- No receipt/share token for depositors (see
  [ACCOUNTING_INVARIANTS.md](ACCOUNTING_INVARIANTS.md)) — revisit if composability with other
  DeFi protocols becomes a goal.
- Production round duration: this MVP's demo deployments use a shortened round length (15
  minutes locally, 2 hours on testnet); `DemoPrizeEngine.roundDuration` should be set to the
  intended production value (the spec this MVP was built against called for 7 days) at deploy
  time — the parameter already supports this, no code change needed.
- Faucets (`MockUSDG.faucet`, `MockJACK.faucet`) obviously have no production equivalent.

## 10. Real `$JACK` contract address after launch

Once `$JACK` is deployed for real, `SponsorRegistry` needs to be redeployed pointing at it (the
constructor parameter already exists for exactly this — see item 1).
