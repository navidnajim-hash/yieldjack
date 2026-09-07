# Accounting Invariants

This document defines YieldJack's accounting terms precisely and states the invariants the
contracts are designed to hold. The Foundry invariant suite
(`packages/contracts/test/Invariants.t.sol`) fuzzes for violations of these directly.

## Definitions

- **Principal** — `YieldJackVault.principal[user]`: the sum of a user's deposits minus their
  withdrawals. This is a pure internal accounting entry. **No receipt or share token is minted
  to depositors.** This was a deliberate MVP design decision:
  - it avoids a secondary market in "eligibility receipts" (someone transferring a receipt token
    to game weight without actually holding the underlying deposit),
  - it removes an entire class of transfer-based accounting bugs,
  - and it keeps the eligibility-weight model (below) tied directly to the one source of truth.

  The trade-off — no composability with other DeFi protocols expecting an ERC-20 receipt — is
  acceptable for a testnet MVP; see [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) if that
  changes later.

- **Vault assets** — `IYieldSource.totalAssetsOf(address(vault))`: the total underlying-asset
  value the vault's shares in the yield source are redeemable for, right now.

- **Realized yield / available yield** — `YieldJackVault.availableYield()` =
  `max(0, vaultAssets - totalPrincipal)`. This is the only source of prize funds derived from the
  yield source. **Principal is structurally excluded from this calculation** — it is subtracted
  out, not merely "not added in," so there is no code path where principal can be
  double-counted into a prize.

- **Eligibility weight** — a per-round, per-user accumulator of "principal × seconds held",
  computed by `YieldJackVault`'s internal checkpoint system and snapshotted into
  `DemoPrizeEngine` at `closeRound`. A deposit made moments before a round closes therefore
  contributes far less weight-seconds than the same deposit held for the whole round. This is an
  original, simplified accumulator — not PoolTogether's TWAB ring buffer — because this MVP only
  ever needs "weight since the current round opened," never an arbitrary historical query. See
  [ARCHITECTURE.md](ARCHITECTURE.md).

- **Sponsored prize funds** — assets transferred directly from `SponsorRegistry` into
  `DemoPrizeEngine`'s own balance, added to a round's `prizeAmount`. Kept structurally separate
  from principal (never touches `YieldJackVault`) and from eligibility weight (never touches any
  user's weight accumulator) — sponsoring a round cannot buy better odds for the sponsor or for
  JACK holders generally.

- **Claim liability** — once a round is `AWARDED`, its `prizeAmount` is a liability owed to
  exactly one address (`winner`) until `claimed` or the round is rolled over. `DemoPrizeEngine`'s
  own `MockUSDG` balance must always be sufficient to cover the sum of every round's outstanding
  `prizeAmount` plus `pendingRolloverFunds` — this is exactly what
  `invariant_vaultAssetsNeverBelowPrincipal` and the "every actor can withdraw" invariant test
  for, transitively, by fuzzing deposits/withdrawals/yield/round-progression together.

## Core invariants

1. **Principal is always fully withdrawable.** `YieldJackVault.withdraw` never reverts due to
   insufficient contract-held assets for a request within a user's recorded principal — see the
   rounding note below for the one caveat.
2. **Principal never funds a prize.** `availableYield()` subtracts `totalPrincipal` before any
   yield can be pulled into escrow; `pullYield` additionally clamps its own request to
   `availableYield()` regardless of what the caller (the prize engine) asks for, as a second,
   independent safety margin.
3. **No double counting.** A given unit of value is at all times exactly one of: outstanding
   principal, un-pulled realized yield sitting in the vault, or an escrowed prize/rollover amount
   sitting in the prize engine. It is never counted in two of those buckets simultaneously.
4. **No double claim, no double finalize.** Each round's state machine only ever moves forward
   (`OPEN → RANDOMNESS_REQUESTED → AWARDED → CLAIMED/EXPIRED`); every mutating function checks
   the round is in the expected state before proceeding.
5. **Sponsorship never changes odds.** `addSponsorFunds` only ever touches `prizeAmount`,
   `sponsorAmount`, `sponsorCount`, `sponsorJackBurned` — never `weights` or `totalWeight`.
6. **Rounding favors protocol solvency.** Every conversion between the vault's assets and the
   yield source's ERC-4626 shares uses OpenZeppelin's default floor-rounding, which can only
   under-report redeemable value, never over-report it.

## The one documented rounding caveat

ERC-4626's floor-rounding, combined with a virtual-shares offset, means that in extreme
yield-to-principal ratios the vault's redeemable claim on the yield source can sit a wei or two
below its nominal recorded `totalPrincipal`. `YieldJackVault.withdraw` handles this by capping
the actual transfer at the vault's real redeemable claim (`totalAssetsOf(address(this))`) instead
of reverting outright — a withdrawal can be short by immaterial rounding dust, but it can never
be blocked entirely by that dust. This was a real bug caught by the invariant fuzzer during
development (see the commit history and `Invariants.t.sol`'s comments): the original
implementation reverted with `ERC4626ExceededMaxWithdraw` in this edge case, which would have
trapped a user's principal. `MockYieldSource`'s pool-relative simulated-yield cap (see
[ARCHITECTURE.md](ARCHITECTURE.md)) additionally keeps this ratio from ever becoming extreme
through ordinary use of the demo controls.
