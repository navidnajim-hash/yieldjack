# JACK Launch Checklist

This is the checklist that must be worked through, in order, before real `$JACK` is ever launched
through pons V2 with `JackFeeRouter` as its `creatorFeeRecipient`. Phase 1 (this repository's
current state) completes none of the launch-day items below — it builds and tests the
infrastructure the launch will use. See [JACK_ARCHITECTURE.md](JACK_ARCHITECTURE.md) for the
verified pons V2 integration this checklist assumes, and
[JACK_THREAT_MODEL.md](JACK_THREAT_MODEL.md) for the risks each step exists to manage.

## 1. Independent security review

Every contract added in this phase — `JackStakingRewards.sol`, `JackFeeRouter.sol`, and the
minimal pons V2 interfaces they depend on — needs a professional audit before holding real value.
Nothing in this repository claims to be audited today. Particular attention should go to:

- The zero-staker reward-queuing mechanism and its interaction with reward top-ups
  (`JackStakingRewards._startStream` / `_pauseStreamIfLive`) — this is original logic, not a
  vendored, previously-audited implementation (see
  [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)).
- `JackFeeRouter`'s trust boundary with pons V2's fee escrow, whose implementation is not
  open-sourced upstream (see [JACK_THREAT_MODEL.md](JACK_THREAT_MODEL.md#pons-v2-is-an-external-dependency)).
- The staking-migration timelock and its validation of a replacement contract's immutables.

## 2. Legal classification review

Get a legal opinion, specific to every jurisdiction JACK will be available in, on: JACK's own
classification, whether staking rewards constitute a regulated return, and how marketing may
describe JACK/staking without crossing into a guaranteed-yield or investment-contract framing. See
[JACK_THREAT_MODEL.md](JACK_THREAT_MODEL.md#regulatory-risk). Do not proceed past this step
without sign-off.

## 3. Re-verify the pons V2 integration, live, immediately before launch

Every value in [JACK_ARCHITECTURE.md](JACK_ARCHITECTURE.md)'s verified-state table is
owner-adjustable pons-side and may have changed since this phase's verification. Re-run, on launch
day, not from memory or from this document:

```bash
forge script script/PrintPonsV2State.s.sol --rpc-url $ROBINHOOD_MAINNET_RPC_URL
```

Confirm specifically: `launchEnabled` is still `true`, the intended `launchConfigId` is still
`enabled` with the expected `supply`/fee terms, `feeEscrow`/`memeHook`/`launchDeployer` addresses
are unchanged (a change would mean pons redeployed core infrastructure — stop and re-verify the
whole integration against the new addresses before proceeding), and `maxCreatorTaxBps` still
permits the intended `creatorTaxBps` (this repository's documented target is `0`).

**If anything disagrees with what was verified in this phase, stop.** Re-verify against source
(see [JACK_ARCHITECTURE.md](JACK_ARCHITECTURE.md)'s verification methodology) before proceeding —
never assume a discrepancy is benign.

## 4. Deploy JackFeeRouter

Deploy with the verified factory/escrow/WETH addresses, the intended prize-reserve and operations
recipients (both should be multisigs — see item 6), and the recommended, tested 70/20/10 split
(`stakerShareBps=7000`, `prizeReserveShareBps=2000`, `operationsShareBps=1000`). This can happen
before JACK exists — `JackFeeRouter`'s constructor never references it.

## 5. Obtain a fresh `expectedEconomics` digest and launch

Call `previewLaunchEconomics(launchConfigId, address(0))` on the live factory **immediately**
before submitting the launch transaction — not a value cached from step 3, which may be stale by
the time the launch transaction actually lands. Launch with:

- `name: "YieldJack"`, `symbol: "JACK"`
- native ETH quote (`pairToken = address(0)`)
- `creatorTaxBps: 0`
- `buybackEnabled: false`
- `creatorFeeRecipient: <JackFeeRouter address>`
- the freshly-read `expectedEconomics` digest, so the launch reverts outright if pons-side terms
  moved between the preview and the launch transaction, rather than silently launching against
  different terms than reviewed

## 6. Deploy JackStakingRewards and configure the router

Deploy `JackStakingRewards` with the real, now-launched JACK token, the verified canonical WETH,
`JackFeeRouter`'s address as `distributor`, and a multisig as `initialOwner`. Then call
`JackFeeRouter.configureJack(jack, staking)` (owner-only, one-time) and confirm it succeeds —
its own validation (live `getLaunchedToken` check, staking-immutables check) is the last
automated backstop against a misconfiguration, but review its preconditions manually anyway before
calling it.

## 7. Multisig administration

Both `JackFeeRouter` and `JackStakingRewards` should be owned by a multisig before launch, not a
single EOA — see [JACK_THREAT_MODEL.md](JACK_THREAT_MODEL.md#yieldjack-administrator-compromise)
for exactly what that owner can and cannot do. Consider whether the 7-day staking-migration
timelock and the recipient setters warrant an additional, separate signing threshold from routine
operational actions.

## 8. Monitoring and incident response

Before launch, wire up alerting on, at minimum:

- `CreatorFeeRecipientChangeProposed` events on the pons factory naming JACK's token address (see
  [JACK_THREAT_MODEL.md](JACK_THREAT_MODEL.md#the-pons-protocol-owners-timelocked-recipient-override-power))
  — the 3-day window must never be missed.
- `StakingMigrationProposed` on `JackFeeRouter` — the 7-day window is YieldJack's own, but should
  still be watched and communicated publicly the moment it fires.
- `harvest()` calls returning `0` for an extended period (could indicate a stalled pons-side fee
  sweep, not necessarily a bug — see
  [JACK_THREAT_MODEL.md](JACK_THREAT_MODEL.md#pons-v2-is-an-external-dependency)).
- Any owner-key admin action on either contract.

Write and rehearse an incident-response runbook, specifically covering "the pons protocol owner
exercises its recipient override" as a distinct scenario from "our own owner key is compromised" —
the two have different blast radii and different response paths (see
[JACK_THREAT_MODEL.md](JACK_THREAT_MODEL.md)).

## 9. User-facing communication

Before or at launch, publish clearly (not buried in fine print):

- MockJACK is unrelated to real JACK — no migration, no exchange rate, no promise (see
  [JACK_THREAT_MODEL.md](JACK_THREAT_MODEL.md#mockjack-is-not-jack)).
- Staking rewards are variable, funded only by real trading activity, and may be zero for extended
  periods — no APR figure, historical or projected, should be advertised as an expectation of
  future return.
- The 70/20/10 split applies to YieldJack's own creator-fee share of trading fees, not to gross
  trading volume or to pons protocol's own fee share.
- pons V2 (factory, bonding curve/hook, fee-sweep operator, fee escrow) is a third-party dependency
  YieldJack does not control, including the pons protocol owner's standing, timelocked power to
  redirect creator fees away from `JackFeeRouter` — link to
  [JACK_THREAT_MODEL.md](JACK_THREAT_MODEL.md) rather than restating it and risking drift.
- These contracts are unaudited until item 1 above is complete, and this document's own checklist
  gates public launch on that review — do not launch publicly before it, and say so.

## 10. Final go/no-go

Do not launch until items 1–9 are all complete and explicitly signed off by whoever owns that
decision. This checklist is necessary but may not be sufficient — treat new information discovered
during any step as a reason to revisit earlier ones, not to skip ahead.
