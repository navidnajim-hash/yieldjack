// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { StdInvariant } from "forge-std/StdInvariant.sol";
import { TestBase } from "./utils/TestBase.sol";
import { DemoPrizeEngine } from "../src/prize/DemoPrizeEngine.sol";
import { IPrizeEngine } from "../src/interfaces/IPrizeEngine.sol";
import { YieldJackVault } from "../src/vault/YieldJackVault.sol";
import { MockUSDG } from "../src/tokens/MockUSDG.sol";

/// @notice A bounded, randomized handler that drives deposits, withdrawals, simulated yield,
///         and full round progression, used to fuzz for accounting-invariant violations.
contract Handler is TestBase {
    address[] internal actors;

    /// @notice Number of action calls made so far. Each deposit/withdraw/yield-simulation can
    ///         introduce at most a wei or two of ERC-4626 floor-rounding dust, so this gives the
    ///         invariant checks a principled, activity-scaled tolerance instead of an arbitrary
    ///         fixed constant that would either be too tight for long campaigns or too loose to
    ///         catch a real insolvency bug.
    uint256 public callCount;

    function setUp() public override {
        super.setUp();
        actors.push(alice);
        actors.push(bob);
        actors.push(carol);
    }

    function deposit(uint256 actorSeed, uint256 amount) external {
        callCount++;
        address user = actors[actorSeed % actors.length];
        amount = bound(amount, 1e6, 10_000e6);
        if (vault.totalPrincipal() + amount > vault.depositCap()) return;

        vm.startPrank(deployer);
        usdg.mint(user, amount);
        vm.stopPrank();

        vm.startPrank(user);
        usdg.approve(address(vault), amount);
        try vault.deposit(amount) { } catch { }
        vm.stopPrank();
    }

    function withdraw(uint256 actorSeed, uint256 amount) external {
        callCount++;
        address user = actors[actorSeed % actors.length];
        uint256 bal = vault.principal(user);
        if (bal == 0) return;
        amount = bound(amount, 1, bal);

        vm.startPrank(user);
        try vault.withdraw(amount) { } catch { }
        vm.stopPrank();
    }

    function simulateYield(uint256 amount) external {
        callCount++;
        amount = bound(amount, 0, yieldSource.MAX_SIMULATED_YIELD_PER_CALL());
        if (amount == 0) return;
        // Reverts (e.g. NoSharesOutstanding when nobody has deposited yet) are an expected,
        // legitimate outcome here, not an invariant violation — swallow them like every other
        // handler action.
        try yieldSource.simulateYield(amount) { } catch { }
    }

    function advanceRound(uint256 warpSeed) external {
        callCount++;
        DemoPrizeEngine.RoundSummary memory r = engine.getRound(engine.currentRoundId());
        uint256 warpTo = uint256(r.endTime) + 1 + bound(warpSeed, 0, 1 days);
        if (warpTo < block.timestamp) return;
        vm.warp(warpTo);
        try engine.closeRound() { } catch { }
    }

    function progressAndClaim(uint256 roundIdSeed) external {
        callCount++;
        uint256 roundId = bound(roundIdSeed, 1, engine.currentRoundId());
        DemoPrizeEngine.RoundSummary memory r = engine.getRound(roundId);

        if (r.state == IPrizeEngine.RoundState.RANDOMNESS_REQUESTED) {
            if (randomness.readyToFulfill(r.requestId)) {
                randomness.fulfillRandomness(r.requestId);
            } else if (!randomness.isFulfilled(r.requestId)) {
                return;
            }
            try engine.finalize(roundId) { } catch { }
            return;
        }

        if (r.state == IPrizeEngine.RoundState.AWARDED) {
            if (block.timestamp >= r.claimDeadline) {
                try engine.rollover(roundId) { } catch { }
            } else if (r.winner != address(0)) {
                vm.prank(r.winner);
                try engine.claim(roundId) { } catch { }
            }
        }
    }

    /// @notice Randomly perturbs the two owner-configurable timing knobs, to fuzz for admin
    ///         changes leaking into a round that has already opened (they must not — both are
    ///         frozen per-round at open time; see DemoPrizeEngine._openRound).
    function changeAdminConfig(uint256 durationSeed, uint256 expirySeed) external {
        callCount++;
        uint256 newDuration = bound(durationSeed, engine.MIN_ROUND_DURATION(), engine.MAX_ROUND_DURATION());
        uint256 newExpiry = bound(expirySeed, engine.MIN_CLAIM_EXPIRY(), engine.MAX_CLAIM_EXPIRY());

        vm.startPrank(deployer);
        engine.setRoundDuration(newDuration);
        engine.setClaimExpiry(newExpiry);
        vm.stopPrank();
    }

    function actorCount() external view returns (uint256) {
        return actors.length;
    }

    function actorAt(uint256 i) external view returns (address) {
        return actors[i];
    }
}

/// @notice Drives `Handler` (which owns the one-and-only deployed system for this run) through
///         randomized actions and checks accounting invariants against that same deployment.
contract InvariantsTest is StdInvariant, Test {
    Handler internal handler;

    // Tracks each round's terms (endTime, claimExpirySeconds) the first time it's observed, so
    // invariant_adminConfigChangesNeverAlterOpenedRoundTerms can catch any later drift.
    mapping(uint256 => bool) internal roundTermsRecorded;
    mapping(uint256 => uint64) internal recordedEndTime;
    mapping(uint256 => uint64) internal recordedClaimExpirySeconds;

    function setUp() public {
        handler = new Handler();
        handler.setUp();
        targetContract(address(handler));

        // Restrict the fuzzer to exactly the intended action functions. Without this, Foundry
        // treats every public/external function on Handler as a fuzzable target — including
        // its inherited `setUp()`, which would redeploy an entirely fresh system mid-campaign.
        bytes4[] memory selectors = new bytes4[](6);
        selectors[0] = Handler.deposit.selector;
        selectors[1] = Handler.withdraw.selector;
        selectors[2] = Handler.simulateYield.selector;
        selectors[3] = Handler.advanceRound.selector;
        selectors[4] = Handler.progressAndClaim.selector;
        selectors[5] = Handler.changeAdminConfig.selector;
        targetSelector(FuzzSelector({ addr: address(handler), selectors: selectors }));
    }

    /// @dev Each handler action can introduce at most a wei or two of ERC-4626 floor-rounding
    ///      dust (see the design notes on YieldJackVault.withdraw), so an activity-scaled tolerance —
    ///      rather than one arbitrary fixed constant — is what actually bounds the invariant
    ///      correctly: too small and long campaigns false-positive on harmless dust, too large
    ///      and a real insolvency bug could hide underneath it. A bound of "a few wei per call
    ///      plus a small constant" still fails hard on any material loss.
    function _dustTolerance() internal view returns (uint256) {
        return handler.callCount() * 2 + 10;
    }

    /// @notice The vault's yield-source claim must always be at least its recorded principal —
    ///         i.e. `availableYield()` can never conceptually go negative (it is clamped, but
    ///         the underlying invariant is what we're really checking here).
    function invariant_vaultAssetsNeverBelowPrincipal() public view {
        uint256 vaultAssets = handler.yieldSource().totalAssetsOf(address(handler.vault()));
        assertGe(vaultAssets + _dustTolerance(), handler.vault().totalPrincipal());
    }

    /// @notice Every actor must always be able to fully withdraw their recorded principal —
    ///         principal is never silently consumed by prize accounting.
    /// @dev Resolves `vault`/`usdg` into locals before pranking: `vm.prank` only applies to the
    ///      very next call, and `handler.vault().withdraw(...)` is actually two calls (the
    ///      `vault()` getter, then `withdraw`) — pranking straight into a chained call like that
    ///      would silently consume the prank on the getter instead of on `withdraw`.
    function invariant_everyActorCanWithdrawTheirFullPrincipal() public {
        YieldJackVault v = handler.vault();
        MockUSDG token = handler.usdg();
        uint256 n = handler.actorCount();

        for (uint256 i = 0; i < n; i++) {
            address actor = handler.actorAt(i);
            uint256 principal = v.principal(actor);
            if (principal == 0) continue;

            uint256 balBefore = token.balanceOf(actor);
            vm.prank(actor);
            v.withdraw(principal);
            uint256 received = token.balanceOf(actor) - balBefore;
            // In extreme yield-to-principal ratios the vault caps the transfer at its
            // floor-rounded ERC-4626 claim (see YieldJackVault.withdraw) — a small amount of
            // dust short of `principal` is expected, never more than that.
            assertApproxEqAbs(received, principal, _dustTolerance());

            // Re-deposit exactly what was received so subsequent invariant calls (and the
            // fuzzer) can keep going without an insufficient-balance revert.
            if (received == 0) continue;
            vm.startPrank(actor);
            token.approve(address(v), received);
            v.deposit(received);
            vm.stopPrank();
        }
    }

    /// @notice No participant's live-previewed weight may ever exceed what the maximum possible
    ///         holding time in the *current* accrual window allows — i.e. no weight earned in an
    ///         earlier round (before `accrualWindowStart`) can ever be reflected in the current
    ///         one. This is the general form of "no weight crossing round boundaries": if stale
    ///         weight from a prior round ever leaked into the current one (the bug this suite
    ///         regression-tests directly in RoundBoundaryRegressions.t.sol), a participant's
    ///         weight would exceed `principal * (now - accrualWindowStart)`, which this catches
    ///         under arbitrary randomized activity, not just the specific hand-crafted scenario.
    function invariant_noWeightCrossesAccrualWindowBoundary() public view {
        YieldJackVault v = handler.vault();
        uint256 windowStart = v.accrualWindowStart();
        uint256 maxElapsed = block.timestamp - windowStart;

        (address[] memory participants, uint256[] memory weights,) = v.previewAllWeights(block.timestamp);
        for (uint256 i = 0; i < participants.length; i++) {
            uint256 principal = v.principal(participants[i]);
            uint256 maxPossibleWeight = principal * maxElapsed;
            assertLe(weights[i], maxPossibleWeight, "a participant's weight exceeds what this accrual window allows");
        }
    }

    /// @notice `DemoPrizeEngine`'s own token balance must always cover every liability it could
    ///         be asked to pay right now: every AWARDED-and-unclaimed round still inside its
    ///         claim window, plus funds already rolled/pending for a future round, plus whatever
    ///         is already escrowed in the currently open round (e.g. from sponsorship).
    function invariant_engineBalanceCoversOutstandingLiabilities() public view {
        DemoPrizeEngine e = handler.engine();
        MockUSDG token = handler.usdg();

        uint256 liabilities = e.pendingRolloverFunds();
        uint256 lastRoundId = e.currentRoundId();
        for (uint256 id = 1; id <= lastRoundId; id++) {
            DemoPrizeEngine.RoundSummary memory r = e.getRound(id);
            if (r.state == IPrizeEngine.RoundState.OPEN || r.state == IPrizeEngine.RoundState.RANDOMNESS_REQUESTED) {
                liabilities += r.prizeAmount; // sponsor funds already escrowed, not yet awarded
            } else if (r.state == IPrizeEngine.RoundState.AWARDED && !r.claimed) {
                liabilities += r.prizeAmount; // owed to the winner until claimed or rolled over
            }
        }

        assertGe(
            token.balanceOf(address(e)) + _dustTolerance(),
            liabilities,
            "prize engine balance does not cover its outstanding prize/rollover liabilities"
        );
    }

    /// @notice Once a round has opened, its frozen terms (`endTime`, `claimExpirySeconds`) must
    ///         never change afterward, no matter how many times the owner calls
    ///         `setRoundDuration`/`setClaimExpiry` in between — see AdminTimingRegressions.t.sol
    ///         for the targeted unit version of this same property.
    function invariant_adminConfigChangesNeverAlterOpenedRoundTerms() public {
        DemoPrizeEngine e = handler.engine();
        uint256 lastRoundId = e.currentRoundId();

        for (uint256 id = 1; id <= lastRoundId; id++) {
            DemoPrizeEngine.RoundSummary memory r = e.getRound(id);
            if (!roundTermsRecorded[id]) {
                roundTermsRecorded[id] = true;
                recordedEndTime[id] = r.endTime;
                recordedClaimExpirySeconds[id] = r.claimExpirySeconds;
                continue;
            }
            assertEq(r.endTime, recordedEndTime[id], "a round's endTime changed after it was opened");
            assertEq(
                r.claimExpirySeconds,
                recordedClaimExpirySeconds[id],
                "a round's claimExpirySeconds changed after it was opened"
            );
        }
    }
}
