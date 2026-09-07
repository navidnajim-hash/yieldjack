// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { TestBase } from "./utils/TestBase.sol";
import { DemoPrizeEngine } from "../src/prize/DemoPrizeEngine.sol";

/// @notice Regression tests for a bug found in independent review: `claimExpiry` was read from
///         mutable owner-controlled storage at `finalize` time, so the owner could change it
///         (including to zero) between a round closing and it being finalized, retroactively
///         shrinking or eliminating the winner's claim window on a round already in flight.
/// @dev These tests are written against the pre-fix contract first (to prove the bug), then
///      re-run after freezing the claim-expiry value per round no later than close and adding
///      sensible nonzero bounds to both `claimExpiry` and `roundDuration`.
contract AdminTimingRegressionsTest is TestBase {
    function test_claimExpiryChangedAfterCloseDoesNotAffectAnInFlightRound() public {
        uint256 roundId = engine.currentRoundId();
        _deposit(alice, 1_000e6);
        _simulateYield(50e6);
        _closeCurrentRound();

        DemoPrizeEngine.RoundSummary memory closed = engine.getRound(roundId);
        _fulfill(closed.requestId);

        // Owner shrinks claimExpiry to the minimum allowed *after* the round has already closed
        // (weight snapshotted, randomness requested) but *before* finalize.
        uint256 originalClaimExpiry = engine.claimExpiry();
        uint256 minClaimExpiry = engine.MIN_CLAIM_EXPIRY(); // resolved before pranking — vm.prank
        // only covers the very next call, and `engine.setClaimExpiry(engine.MIN_CLAIM_EXPIRY())`
        // would otherwise consume the prank on the inner view call instead of the setter.
        vm.prank(deployer);
        engine.setClaimExpiry(minClaimExpiry);

        engine.finalize(roundId);
        DemoPrizeEngine.RoundSummary memory awarded = engine.getRound(roundId);

        // The claim window actually granted must reflect what was in effect when the round
        // opened/closed, not whatever the owner changed it to afterward.
        uint256 expectedDeadline = awarded.awardedAt + originalClaimExpiry;
        assertEq(
            awarded.claimDeadline, expectedDeadline, "claimExpiry changed after close leaked into an in-flight round"
        );

        // Concretely: the winner must still be able to claim well after the maliciously-short
        // window the owner tried to impose.
        vm.warp(awarded.awardedAt + 2);
        vm.prank(alice);
        engine.claim(roundId); // must not revert
    }

    function test_setClaimExpiryRejectsZero() public {
        vm.prank(deployer);
        vm.expectRevert();
        engine.setClaimExpiry(0);
    }

    function test_setRoundDurationRejectsZero() public {
        vm.prank(deployer);
        vm.expectRevert();
        engine.setRoundDuration(0);
    }

    function test_roundDurationChangedAfterOpenDoesNotAffectInFlightRound() public {
        DemoPrizeEngine.RoundSummary memory openRound = engine.getRound(engine.currentRoundId());
        uint64 originalEndTime = openRound.endTime;

        vm.prank(deployer);
        engine.setRoundDuration(ROUND_DURATION * 10);

        DemoPrizeEngine.RoundSummary memory afterChange = engine.getRound(engine.currentRoundId());
        assertEq(afterChange.endTime, originalEndTime, "roundDuration change retroactively altered an open round");
    }
}
