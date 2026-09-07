# Threat Model

This is a testnet MVP using worthless mock tokens; nothing here protects real value today. This
document exists so that (a) reviewers can reason about what the contracts actually guard
against, and (b) the production roadmap has a concrete list of what a real deployment must
re-examine. See [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) for remediation timing.

## Yield-source loss

**Risk:** the venue backing deposits loses value (a real yield source could be hacked, or have
an oracle failure, or simply run at a loss).

**MVP status:** `MockYieldSource` cannot "lose" value in the way a real venue could — its only
value-changing operation is `simulateYield`, which only ever adds value, capped and guarded (see
[ARCHITECTURE.md](ARCHITECTURE.md)) against share-price manipulation. This risk class is
therefore not really exercised by this MVP; it becomes real the moment a production deployment
points `YieldJackVault` at an actual money-market vault. `availableYield()`'s floor-rounding
formula (`vaultAssets - totalPrincipal`, clamped to zero) means that if the yield source's real
value ever fell below recorded principal, `availableYield()` would correctly report zero rather
than a negative number or an inflated one — but a real production integration needs its own
solvency monitoring; this MVP does not attempt to detect or alert on yield-source insolvency.

## Randomness manipulation

**Risk:** whoever controls block production (or, in this demo, whoever calls
`fulfillRandomness` at a chosen moment) could bias or predict the "random" winner.

**MVP status:** `DemoRandomnessProvider` is explicitly, deliberately insecure — see its own
NatSpec, the Transparency page, and [ARCHITECTURE.md](ARCHITECTURE.md). It derives its value from
a block hash 1+ blocks after the request, which is public information anyone can see before
calling `fulfillRandomness`, and which a block producer could in principle bias. This is
acceptable **only** because: it clearly says so everywhere a user or reviewer would look, the
value at stake is worthless mock currency, and swapping in a real VRF is a drop-in replacement
behind `IRandomnessProvider` (see [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md)).

## Administrator compromise

**Risk:** the deploying/owner key is stolen or misused.

**MVP status:** the owner's powers are deliberately narrow and enumerated:
- `YieldJackVault`: `setDepositCap`, `pause`/`unpause` (blocks new deposits only —
  **withdrawals are never gated by pause**), and a one-time `setPrizeEngine` wiring call that is
  permanently locked after first use.
- `DemoPrizeEngine`: `setRoundDuration`/`setClaimExpiry` (affect only future rounds/awards, never
  an in-flight round — `claimExpiry` is frozen into each round at award time specifically so it
  can't be retroactively shortened), and a one-time `setSponsorRegistry` wiring call.
- `DemoRandomnessProvider`/`SponsorRegistry`: similarly narrow, one-time wiring plus (for the
  registry) `setMinJackBurn`.

**No owner function can select a winner, override a round's result, or move a depositor's
principal or an awarded prize out of the contracts.** A compromised owner key could pause new
deposits, change the deposit cap, or change future-round parameters — real but bounded damage,
recoverable by redeploying and re-pointing the frontend, since no funds are ever at the
compromised key's direct disposal.

## Reentrancy

**Risk:** an external call (token transfer, yield-source call) re-enters a vault/engine function
mid-execution.

**MVP status:** every fund-moving external function (`deposit`, `withdraw`, `pullYield`,
`closeRound`, `claim`) uses OpenZeppelin's `ReentrancyGuard` and follows checks-effects-
interactions (internal state is updated before any external call). `test/Reentrancy.t.sol`
proves this concretely with a malicious ERC-20 whose `transfer` re-enters `withdraw` mid-call —
the guard causes the entire outer transaction to revert.

## Rounding / accounting errors

**Risk:** integer division in share/asset conversions creates exploitable or merely confusing
discrepancies.

**MVP status:** covered in depth in
[ACCOUNTING_INVARIANTS.md](ACCOUNTING_INVARIANTS.md). Two real issues were found by the
Foundry invariant fuzzer during development and fixed: an ERC-4626 share-inflation vector in
`simulateYield`, and a full-principal withdrawal that could revert outright instead of gracefully
capping at the vault's real redeemable claim. Both are now covered by regression tests.

## Flash deposits

**Risk:** deposit immediately before a round closes to claim a large share of eligibility, then
withdraw immediately after.

**MVP status:** this is exactly what the time-weighted eligibility model is designed to make
unprofitable — a deposit held for `Δt` out of a round of length `T` contributes only
`principal × Δt` weight-seconds, not `principal × T`. A deposit made one block before close
contributes approximately zero weight. There is no flash-loan-callback surface in these
contracts (no callback is ever made to `msg.sender` during `deposit`), so a flash-loaned deposit
gains nothing beyond what the time-weighting formula already accounts for.

## Draw interruption

**Risk:** a round gets stuck — nobody calls `closeRound`/`fulfillRandomness`/`finalize`, or a
prize goes permanently unclaimed.

**MVP status:** every lifecycle-advancing function is permissionless, so any eligible user (or
the optional keeper) can always move a round forward — there is no privileged "operator" the
system depends on. Unclaimed, expired prizes roll forward into a future round via `rollover`
(also permissionless) rather than being stranded. A round that closes with zero eligible weight
or zero prize resolves immediately to `EXPIRED` rather than requesting meaningless randomness.

## Malicious tokens

**Risk:** a token with unusual transfer semantics (fee-on-transfer, rebasing, reentrant hooks)
breaks the accounting.

**MVP status:** `MockUSDG`/`MockJACK` are standard OpenZeppelin ERC-20s with none of those
behaviors, and `SafeERC20` is used for every transfer. A production deployment replacing
`MockUSDG` with the real canonical USDG must independently verify USDG has no fee-on-transfer or
rebasing behavior before reusing this accounting model unmodified — see
[PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md).

## RPC / indexing failures

**Risk:** the frontend reads stale or unavailable chain state.

**MVP status:** the frontend has no server-side indexer or cache of its own — every read goes
through wagmi/viem directly to the configured RPC endpoint, polled on a short interval (see
`apps/web/src/hooks/useYieldJackData.ts`). If the RPC is unreachable, reads fail gracefully into
loading/empty states (see the Testnet Status page, which surfaces RPC reachability directly)
rather than showing fabricated numbers.

## Frontend compromise

**Risk:** a compromised build or CDN serves a modified frontend that tricks users into signing a
malicious transaction.

**MVP status:** out of scope for contract-level mitigation — this is inherent to any dApp
frontend. The static-export build has no server-side component to compromise beyond the static
files themselves; standard practices (subresource integrity, a trusted deployment pipeline,
users verifying transaction details in their wallet before signing) apply as they would to any
dApp. Not addressed further in this MVP.

## Sponsor abuse

**Risk:** sponsorship is used to grief a round, launder value, or buy influence over odds.

**MVP status:** `addSponsorFunds` only ever adds to `prizeAmount` on the currently *open* round
(never a closed one) and never touches any user's weight — a sponsor cannot buy themselves, or
anyone else, a better chance of winning. Metadata length is capped
(`SponsorRegistry.MAX_METADATA_LENGTH`) to bound storage/gas griefing. A sponsor can only add
value to a round, never remove it, and sponsoring is not reversible — there is no path by which a
sponsor's contribution can be reclaimed once sent.
