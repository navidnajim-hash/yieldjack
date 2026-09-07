# JACK Threat Model — Phase 1 (fee routing + staking)

This covers `JackFeeRouter.sol` and `JackStakingRewards.sol` only. See
[THREAT_MODEL.md](THREAT_MODEL.md) for the existing testnet-MVP contracts (unchanged by this
phase) and [JACK_ARCHITECTURE.md](JACK_ARCHITECTURE.md) for how the pons V2 integration below was
verified. **No `$JACK` token has been launched, and JACK must not be publicly launched until the
staking/router contracts described here receive an independent security review and a legal
classification review** — see [JACK_LAUNCH_CHECKLIST.md](JACK_LAUNCH_CHECKLIST.md). Nothing below
should be read as a claim that these contracts have been audited; they have not.

## MockJACK is not JACK

**Risk:** a user confuses the existing testnet-demo `MockJACK` token with real `$JACK`, or expects
one to convert into the other.

**Status:** `MockJACK` is, and remains, a valueless, faucet-mintable testnet token with no code
path connecting it to anything in this phase — `JackStakingRewards`/`JackFeeRouter` never
reference `MockJACK`'s address, and nothing in this repository implements or plans a migration,
airdrop-by-balance, or exchange rate between the two. Anyone holding `MockJACK` has no claim on
real `$JACK` and none is implied anywhere in code, docs, or UI copy. See `MockJACK.sol`'s own
NatSpec and CLAUDE.md's absolute rule on this point.

## Rewards are variable and may be zero

**Risk:** a staker (or anyone marketing this system) treats staking rewards as a fixed or
guaranteed yield.

**Status:** there is no fixed APR anywhere in this design, no inflationary reward emission, and no
minting — `JackStakingRewards` only ever distributes WETH that `JackFeeRouter` has actually
harvested from real, realized creator trading fees. If JACK trades rarely, if fees are low, or if
nobody trades at all, `harvest()` legitimately returns `0` and stakers earn nothing for that
period. This is a structural property, not a bug: reward size is a direct, unmanipulated function
of real trading activity. Any future marketing or UI copy must not state or imply a fixed or
expected return — see [JACK_LAUNCH_CHECKLIST.md](JACK_LAUNCH_CHECKLIST.md).

## The 70/20/10 split applies to creator revenue, not gross trading fees

**Risk:** someone assumes stakers receive 70% of all trading volume, fees, or protocol revenue on
JACK.

**Status:** pons V2's own fee policy (verified live — see
[JACK_ARCHITECTURE.md](JACK_ARCHITECTURE.md)) already splits gross trade fees between the pons
protocol, its buyback mechanism, and the creator (YieldJack) *before* any of it reaches
`JackFeeRouter`. The 70/20/10 split this repository implements applies only to **YieldJack's own
creator-fee share** — whatever pons credits to `JackFeeRouter`'s escrow balance — never to gross
trading volume or to the pons protocol's own share, which YieldJack has no claim on and no
visibility into beyond what `IPonsV2FeePolicy.currentFeePolicy()` reports.

## pons V2 is an external dependency

**Risk:** the pons V2 factory, meme hook, fee-sweep operator, or fee escrow behaves unexpectedly,
is paused, is upgraded, or is compromised.

**Status:** this is a real, standing dependency this design cannot eliminate — `JackFeeRouter`
only ever harvests what pons's own contracts choose to credit it. Specific mitigations:

- `harvest()` claims exactly the balance it reads and measures the actual ETH received rather than
  trusting any return value, so a fee escrow that under-pays (accidentally or otherwise) cannot
  cause the router to distribute more than it actually holds.
- `harvest()` is wrapped in `nonReentrant`, so even a hostile fee escrow cannot re-enter it.
- The fee escrow's **implementation** is not open-sourced in the pons V2 repository — only its
  interface is (`IPonsV2FeeEscrow`, in `ILaunchpadV2.sol`). This repository does not, and cannot,
  audit that implementation's own source; it can only observe its live behavior (see the fork test)
  and defend against it acting adversarially at the ABI boundary (measure-don't-trust,
  reentrancy guard, no unbounded approval).
- `feeSweepOperator` (a separate, pons-owned role from the protocol owner — verified live, see
  [JACK_ARCHITECTURE.md](JACK_ARCHITECTURE.md)) can trigger a bonding curve's fee sweep. This
  repository depends on sweeps happening (by that operator, or permissionlessly by anyone,
  including `JackFeeRouter` itself as `creatorFeeRecipient` — see `PonsV2BondingCurve.sweepFees`)
  for fees to reach the escrow at all before `harvest()` has anything to claim. A stalled sweep
  delays rewards; it cannot lose or misdirect them.
- If pons V2 is ever paused, deprecated, or found to have a critical vulnerability, `harvest()`
  simply stops producing anything new — it has no privileged access that a pons-side incident could
  escalate into a YieldJack-side loss of already-distributed funds.

## The pons protocol owner's timelocked recipient-override power

**Risk:** pons V2's own protocol owner (verified live as a contract, not a bare EOA — see
[JACK_ARCHITECTURE.md](JACK_ARCHITECTURE.md)) proposes and executes an override of JACK's
`creatorFeeRecipient` away from `JackFeeRouter`, redirecting all future creator fees.

**Status:** this is a genuine, standing power documented directly from pons V2 source — confirmed,
not assumed (see [JACK_ARCHITECTURE.md](JACK_ARCHITECTURE.md)) — and this repository cannot disable
or opt out of it; it belongs entirely to the pons protocol, not to YieldJack. Specific properties,
also confirmed from source:

- It is **timelocked**: a proposal (`PonsV2LaunchFactory.setCreatorFeeRecipient`) must sit for a
  fixed delay (3 days, read live as exactly `259200` seconds) before `executeCreatorFeeRecipientChange`
  can apply it, and expires if not executed within a further fixed window (also 3 days). It is not
  instant or silent — the proposal and its effective time are both emitted on-chain the moment it
  is proposed.
- It is **not narrowly scoped to lost-key recovery** — the pons owner may redirect any launch's
  recipient at any time, for any reason. It should be treated as a standing protocol power, not an
  emergency-only mechanism.
- `JackFeeRouter` has **no function that could call `transferCreatorFeeRecipient`** on its own
  behalf (this repository deliberately implements no generic/arbitrary-call passthrough — see
  [JACK_ARCHITECTURE.md](JACK_ARCHITECTURE.md)). Once configured, JACK's `creatorFeeRecipient` is
  permanently `JackFeeRouter` unless the pons protocol owner exercises this override; YieldJack's
  own owner cannot move it.
- **Monitoring recommendation:** before any real launch, set up on-chain alerting on
  `CreatorFeeRecipientChangeProposed` events naming JACK's token address, so the 3-day window is
  never missed. This repository does not yet include that monitoring — see
  [JACK_LAUNCH_CHECKLIST.md](JACK_LAUNCH_CHECKLIST.md).
- **Blast radius if exercised:** future creator fees stop reaching `JackFeeRouter` and start
  reaching whatever address the pons owner named. Funds already claimed and distributed by past
  `harvest()` calls, and everything already staked in `JackStakingRewards`, are unaffected — this
  contract never custodies pons-side balances between harvests.

## YieldJack administrator compromise

**Risk:** the `JackFeeRouter`/`JackStakingRewards` owner key is stolen or misused.

**Status:** owner powers are deliberately narrow and enumerated:

- `JackFeeRouter`: `configureJack` (one-time only), `setPrizeReserveRecipient` /
  `setOperationsRecipient` (redirect only the 20%/10% shares, never the 70% staker share, which
  always flows to `staking`), `propose`/`execute`/`cancelStakingMigration` (the execute step is
  gated by a mandatory 7-day timelock, visible on-chain for its full duration), and `rescue`
  (unconditionally excludes WETH).
- `JackStakingRewards`: `pause`/`unpause` (blocks new stakes only — **withdrawals and reward claims
  are never gated by pause**) and `rescue` (unconditionally excludes both JACK and WETH).

**No owner function on either contract can select who receives the staker share outside the
7-day-timelocked migration path, seize a staker's principal or earned/queued/streaming reward, or
move JACK/WETH out through `rescue`.** A compromised owner key could redirect the prize-reserve or
operations share, pause new stakes, or propose (but not immediately execute) a staking migration —
real but bounded and, for the migration path, visible for a full week before it could take effect.

## Reentrancy

**Risk:** an external call (WETH transfer, fee-escrow claim, staking notification) re-enters a
router/staking function mid-execution.

**Status:** every fund-moving external function (`stake`, `withdraw`, `claimReward`,
`notifyRewardAmount`, `harvest`) uses OpenZeppelin's `ReentrancyGuard` and follows
checks-effects-interactions. `test/JackReentrancy.t.sol` proves this concretely against three
distinct attack surfaces: a malicious JACK token re-entering `withdraw`, a malicious WETH token
re-entering `claimReward`, and a malicious fee escrow re-entering `harvest` — every case reverts
the entire outer call.

## Malicious or reverting recipients

**Risk:** a hostile or merely non-payable recipient contract blocks its own or someone else's
payout.

**Status:** neither contract ever pushes native ETH to a recipient it does not fully control the
timing of. `JackFeeRouter.harvest` wraps all claimed ETH to WETH *before* distributing it, and
every payout on both contracts (`withdraw`, `claimReward`, and `harvest`'s three splits) moves
through `SafeERC20.safeTransfer` — a plain ERC-20 transfer has no recipient callback, so a
non-payable or intentionally-reverting recipient contract cannot block anyone's share. Proven by
`JackFeeRouter.t.sol`'s `test_harvest_succeedsWithRevertingRecipients`, which sets the prize-reserve
recipient to a contract with no `receive()`/payable fallback at all and confirms `harvest()` still
succeeds. `receive()` on `JackFeeRouter` itself is restricted to `feeEscrow` only, so this contract
also cannot be griefed into holding stray native ETH from anyone else.

## Direct token donations

**Risk:** someone sends JACK or WETH directly to either contract, bypassing `stake`/
`notifyRewardAmount`, hoping to corrupt accounting or extract value.

**Status:** `totalStaked` and the reward-stream accounting are both tracked purely by internal
state, never by reading a live token balance — a direct donation is never credited to any staker,
never inflates anyone's `earned()`, and is not reachable through `withdraw`, `claimReward`, or
`rescue` (which unconditionally excludes both protocol tokens). It simply becomes permanently
inert surplus balance. See `test_directJackDonation_neverCreditedToAnyStaker` and
`test_directWethDonation_neverStreamedToAnyone`.

## Rounding / accounting errors

**Risk:** integer division in the fee split or the reward-rate calculation creates an exploitable
or merely confusing discrepancy.

**Status:** `JackFeeRouter._splitAmount` gives the operations share the exact remainder after the
(floor-rounded) staker and prize-reserve shares, so the three shares always sum to exactly the
amount received — proven for arbitrary amounts by `testFuzz_harvest_splitsAlwaysSumToReceivedExactly`.
`JackStakingRewards`'s reward-rate math can lose at most a few hundred-thousand wei per
`notifyRewardAmount` call to floor-rounding (bounded by `REWARDS_DURATION` in wei terms — utterly
negligible against realistic WETH amounts); this dust is never double-counted or attributed to the
wrong staker, only left as unclaimed contract balance. `JackInvariants.t.sol`'s
`invariant_wethBalanceMatchesTrackedFlows` fuzzes randomized stake/withdraw/claim/harvest/donation
sequences and asserts the contract's WETH balance always equals exactly what those flows imply.

## No unbounded loops

**Risk:** a function's gas cost grows with the number of stakers or launches, eventually making it
uncallable.

**Status:** neither contract contains a loop over holders, stakers, or launches anywhere — reward
accounting is O(1) per call by construction (the `rewardPerToken` pattern), unlike
`YieldJackVault`'s explicitly-bounded, testnet-only `MAX_PARTICIPANTS` loop elsewhere in this
repository. Gas cost of `stake`/`withdraw`/`claimReward`/`harvest` does not grow with the number of
stakers.

## Contract, liquidity, and price risk (JACK itself, not this phase's contracts)

**Risk:** JACK's bonding curve or graduated Uniswap V4 pool experiences low liquidity, high price
volatility, or a smart-contract failure in pons V2 itself.

**Status:** out of scope for `JackFeeRouter`/`JackStakingRewards` to mitigate — these contracts
have no price exposure to JACK (the router never holds or trades JACK; the staking contract holds
staked JACK 1:1, custodially, with no pricing logic at all) and no liquidity-provision role. This
risk belongs to pons V2's own design and to JACK's market once launched, not to this phase's code.
Noted here so it is not mistaken for something this repository has addressed.

## Smart-wallet / account-abstraction risk

**Risk:** a staker or recipient using a smart-contract wallet (a Safe, an ERC-4337 account, etc.)
behaves unexpectedly against these contracts.

**Status:** neither contract makes any assumption about caller type — every entry point
(`stake`/`withdraw`/`claimReward`/`exit`/`harvest`) is a plain external call keyed on `msg.sender`
with no `tx.origin` usage, no EOA-only check, and no signature-based authentication that a smart
wallet's non-standard signing flow could break. A smart-contract staker or recipient works exactly
like an EOA one. The one caveat is generic to any contract: if a staker's own wallet contract has a
bug that makes it unable to call `withdraw`/`claimReward` itself, this repository cannot recover
funds on that wallet's behalf — standard self-custody risk, not specific to this design.

## Regulatory risk

**Risk:** JACK, or the staking rewards it produces, is classified as a security or otherwise
regulated instrument in some jurisdiction.

**Status:** not assessed by this repository — this is explicitly a code-and-infrastructure phase,
not a legal one. **JACK must not be publicly launched until a legal classification review has been
completed**, alongside the independent security review — see
[JACK_LAUNCH_CHECKLIST.md](JACK_LAUNCH_CHECKLIST.md). Nothing in this repository's code, tests, or
documentation should be read as, or relied on as, legal advice about JACK's regulatory status in
any jurisdiction.
