// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { TestBase } from "./utils/TestBase.sol";
import { DemoPrizeEngine } from "../src/prize/DemoPrizeEngine.sol";
import { IPrizeEngine } from "../src/interfaces/IPrizeEngine.sol";
import { SponsorRegistry } from "../src/prize/SponsorRegistry.sol";

contract DemoPrizeEngineTest is TestBase {
    function _expectedWinner(address[] memory participants, uint256[] memory weights, uint256 randomValue)
        internal
        pure
        returns (address)
    {
        uint256 totalWeight;
        for (uint256 i = 0; i < weights.length; i++) {
            totalWeight += weights[i];
        }
        uint256 target = randomValue % totalWeight;
        uint256 cumulative;
        for (uint256 i = 0; i < participants.length; i++) {
            cumulative += weights[i];
            if (target < cumulative) return participants[i];
        }
        return participants[participants.length - 1];
    }

    function test_fullHappyPathEndToEnd() public {
        uint256 roundId = engine.currentRoundId();
        assertEq(uint8(engine.roundState(roundId)), uint8(IPrizeEngine.RoundState.OPEN));

        _deposit(alice, 1_000e6);
        _simulateYield(100e6);

        _closeCurrentRound();
        assertEq(uint8(engine.roundState(roundId)), uint8(IPrizeEngine.RoundState.RANDOMNESS_REQUESTED));
        assertEq(engine.currentRoundId(), roundId + 1, "a new round must always open");

        DemoPrizeEngine.RoundSummary memory closed = engine.getRound(roundId);
        assertApproxEqAbs(closed.prizeAmount, 100e6, 2);

        _fulfill(closed.requestId);
        engine.finalize(roundId);

        DemoPrizeEngine.RoundSummary memory awarded = engine.getRound(roundId);
        assertEq(uint8(awarded.state), uint8(IPrizeEngine.RoundState.AWARDED));
        assertEq(awarded.winner, alice, "sole depositor must win");

        uint256 balBefore = usdg.balanceOf(alice);
        vm.prank(alice);
        engine.claim(roundId);
        assertEq(usdg.balanceOf(alice) - balBefore, awarded.prizeAmount);
        assertEq(uint8(engine.roundState(roundId)), uint8(IPrizeEngine.RoundState.CLAIMED));

        // Alice's principal must still be fully withdrawable afterward.
        vm.prank(alice);
        vault.withdraw(1_000e6);
    }

    function test_winnerSelectionIsDeterministicFromWeights() public {
        uint256 roundId = engine.currentRoundId();
        _deposit(alice, 1_000e6);
        _deposit(bob, 3_000e6);
        _simulateYield(200e6);
        _closeCurrentRound();

        DemoPrizeEngine.RoundSummary memory closed = engine.getRound(roundId);
        _fulfill(closed.requestId);

        (address[] memory participants, uint256[] memory weights) = engine.getRoundParticipants(roundId);
        uint256 randomValue = randomness.getRandomness(closed.requestId);
        address expected = _expectedWinner(participants, weights, randomValue);

        // Finalizing from an arbitrary, unprivileged address must not change the outcome —
        // winner selection depends only on randomness and the weight snapshot, never on
        // who calls `finalize`.
        vm.prank(carol);
        engine.finalize(roundId);

        assertEq(engine.getRound(roundId).winner, expected);
    }

    function test_closeRoundWithNoDepositsSkipsDrawAndRollsForward() public {
        uint256 roundId = engine.currentRoundId();
        _closeCurrentRound();

        DemoPrizeEngine.RoundSummary memory r = engine.getRound(roundId);
        assertEq(uint8(r.state), uint8(IPrizeEngine.RoundState.EXPIRED));
        assertEq(r.prizeAmount, 0);
        assertEq(r.requestId, 0, "no randomness should ever be requested");
    }

    function test_closeRoundWithDepositsButNoYieldSkipsDraw() public {
        uint256 roundId = engine.currentRoundId();
        _deposit(alice, 1_000e6);
        _closeCurrentRound();

        DemoPrizeEngine.RoundSummary memory r = engine.getRound(roundId);
        assertEq(uint8(r.state), uint8(IPrizeEngine.RoundState.EXPIRED));
        assertEq(r.prizeAmount, 0);

        // Alice's principal must be completely unaffected and withdrawable.
        assertEq(vault.principal(alice), 1_000e6);
        vm.prank(alice);
        vault.withdraw(1_000e6);
    }

    function test_yieldIsNotStrandedWhenNoEligibleParticipants() public {
        // Yield accrues in the yield source but nobody is an eligible depositor when the round
        // closes (Alice withdrew before close). `closeRound` deliberately does NOT pull yield
        // it has nobody to award, leaving it in the vault (still earning) rather than parking
        // it in escrow — the yield must not be stranded or lost either way.
        uint256 roundId = engine.currentRoundId();
        _deposit(alice, 1_000e6);
        _simulateYield(50e6);

        vm.prank(alice);
        vault.withdraw(1_000e6);

        _closeCurrentRound();
        DemoPrizeEngine.RoundSummary memory closedRound = engine.getRound(roundId);
        assertEq(uint8(closedRound.state), uint8(IPrizeEngine.RoundState.EXPIRED));
        assertEq(closedRound.prizeAmount, 0);

        // The yield was never pulled out of the vault — it must still be sitting there,
        // recoverable, rather than vanished.
        assertApproxEqAbs(vault.availableYield(), 50e6, 2);

        // Once someone becomes eligible again and a round actually closes with them in it,
        // that yield gets pulled into a real prize.
        uint256 roundBeforeBobCloses = engine.currentRoundId();
        _deposit(bob, 1_000e6);
        _closeCurrentRound();
        DemoPrizeEngine.RoundSummary memory nowClosed = engine.getRound(roundBeforeBobCloses);
        assertApproxEqAbs(nowClosed.prizeAmount, 50e6, 2);
    }

    function test_doubleFinalizeReverts() public {
        uint256 roundId = engine.currentRoundId();
        _deposit(alice, 1_000e6);
        _simulateYield(50e6);
        _closeCurrentRound();

        DemoPrizeEngine.RoundSummary memory closed = engine.getRound(roundId);
        _fulfill(closed.requestId);
        engine.finalize(roundId);

        vm.expectRevert(abi.encodeWithSelector(DemoPrizeEngine.RoundNotAwaitingRandomness.selector, roundId));
        engine.finalize(roundId);
    }

    function test_finalizeRevertsBeforeRandomnessFulfilled() public {
        uint256 roundId = engine.currentRoundId();
        _deposit(alice, 1_000e6);
        _simulateYield(50e6);
        _closeCurrentRound();

        DemoPrizeEngine.RoundSummary memory closed = engine.getRound(roundId);
        vm.expectRevert(abi.encodeWithSelector(DemoPrizeEngine.RandomnessNotFulfilled.selector, closed.requestId));
        engine.finalize(roundId);
    }

    function test_onlyWinnerCanClaim() public {
        uint256 roundId = engine.currentRoundId();
        _deposit(alice, 1_000e6);
        _simulateYield(50e6);
        _closeCurrentRound();
        DemoPrizeEngine.RoundSummary memory closed = engine.getRound(roundId);
        _fulfill(closed.requestId);
        engine.finalize(roundId);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(DemoPrizeEngine.NotWinner.selector, bob));
        engine.claim(roundId);
    }

    function test_doubleClaimReverts() public {
        uint256 roundId = engine.currentRoundId();
        _deposit(alice, 1_000e6);
        _simulateYield(50e6);
        _closeCurrentRound();
        DemoPrizeEngine.RoundSummary memory closed = engine.getRound(roundId);
        _fulfill(closed.requestId);
        engine.finalize(roundId);

        vm.startPrank(alice);
        engine.claim(roundId);
        vm.expectRevert(abi.encodeWithSelector(DemoPrizeEngine.RoundNotAwarded.selector, roundId));
        engine.claim(roundId);
        vm.stopPrank();
    }

    function test_unclaimedPrizeRollsOverAfterExpiry() public {
        uint256 roundId = engine.currentRoundId();
        _deposit(alice, 1_000e6);
        _simulateYield(50e6);
        _closeCurrentRound();
        DemoPrizeEngine.RoundSummary memory closed = engine.getRound(roundId);
        _fulfill(closed.requestId);
        engine.finalize(roundId);

        DemoPrizeEngine.RoundSummary memory awarded = engine.getRound(roundId);
        vm.warp(uint256(awarded.claimDeadline) + 1);

        engine.rollover(roundId);
        assertEq(uint8(engine.roundState(roundId)), uint8(IPrizeEngine.RoundState.EXPIRED));

        // Alice can no longer claim the expired round...
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(DemoPrizeEngine.RoundNotAwarded.selector, roundId));
        engine.claim(roundId);

        // ...but the prize must reappear in a future round rather than vanishing.
        DemoPrizeEngine.RoundSummary memory current = engine.getRound(engine.currentRoundId());
        assertApproxEqAbs(current.prizeAmount, awarded.prizeAmount, 2);
    }

    function test_rolloverBeforeExpiryReverts() public {
        uint256 roundId = engine.currentRoundId();
        _deposit(alice, 1_000e6);
        _simulateYield(50e6);
        _closeCurrentRound();
        DemoPrizeEngine.RoundSummary memory closed = engine.getRound(roundId);
        _fulfill(closed.requestId);
        engine.finalize(roundId);

        DemoPrizeEngine.RoundSummary memory awarded = engine.getRound(roundId);
        vm.expectRevert(abi.encodeWithSelector(DemoPrizeEngine.ClaimWindowNotExpired.selector, awarded.claimDeadline));
        engine.rollover(roundId);
    }

    function test_sponsorFundsAddToPrizeButNeverToWeight() public {
        uint256 roundId = engine.currentRoundId();
        _deposit(alice, 1_000e6);
        _deposit(bob, 1_000e6);

        vm.startPrank(deployer);
        usdg.mint(sponsorWallet, 500e6);
        jack.ownerMint(sponsorWallet, 100 ether);
        vm.stopPrank();

        vm.startPrank(sponsorWallet);
        usdg.approve(address(sponsorRegistry), 500e6);
        jack.approve(address(sponsorRegistry), 100 ether);
        sponsorRegistry.sponsor(500e6, 100 ether, "demo sponsorship");
        vm.stopPrank();

        DemoPrizeEngine.RoundSummary memory beforeClose = engine.getRound(roundId);
        assertEq(beforeClose.sponsorAmount, 500e6);
        assertEq(beforeClose.prizeAmount, 500e6, "sponsor funds must be visible before any yield");

        // Weights must be untouched by sponsorship — both depositors still weigh equally.
        (address[] memory participants, uint256[] memory weights,) = vault.previewAllWeights(block.timestamp);
        uint256 aliceWeight;
        uint256 bobWeight;
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] == alice) aliceWeight = weights[i];
            if (participants[i] == bob) bobWeight = weights[i];
        }
        assertEq(aliceWeight, bobWeight, "equal deposits must carry equal weight regardless of sponsorship");

        _closeCurrentRound();
        DemoPrizeEngine.RoundSummary memory closed = engine.getRound(roundId);
        assertApproxEqAbs(closed.prizeAmount, 500e6, 2);
        assertEq(closed.lastSponsor, sponsorWallet);
        assertEq(closed.sponsorJackBurned, 100 ether);
        assertEq(jack.balanceOf(0x000000000000000000000000000000000000dEaD), 100 ether);
    }

    function test_sponsorBelowMinJackBurnReverts() public {
        vm.startPrank(deployer);
        usdg.mint(sponsorWallet, 500e6);
        jack.ownerMint(sponsorWallet, 1 ether);
        vm.stopPrank();

        vm.startPrank(sponsorWallet);
        usdg.approve(address(sponsorRegistry), 500e6);
        jack.approve(address(sponsorRegistry), 1 ether);
        vm.expectRevert(
            abi.encodeWithSelector(SponsorRegistry.JackBurnTooLow.selector, 1 ether, sponsorRegistry.minJackBurn())
        );
        sponsorRegistry.sponsor(500e6, 1 ether, "too little JACK");
        vm.stopPrank();
    }

    function test_closeRoundRevertsWhilePaused() public {
        vm.prank(deployer);
        vault.pause();

        DemoPrizeEngine.RoundSummary memory r = engine.getRound(engine.currentRoundId());
        vm.warp(uint256(r.endTime) + 1);

        vm.expectRevert(DemoPrizeEngine.VaultPaused.selector);
        engine.closeRound();
    }

    function test_claimStillWorksWhilePaused() public {
        uint256 roundId = engine.currentRoundId();
        _deposit(alice, 1_000e6);
        _simulateYield(50e6);
        _closeCurrentRound();
        DemoPrizeEngine.RoundSummary memory closed = engine.getRound(roundId);
        _fulfill(closed.requestId);
        engine.finalize(roundId);

        vm.prank(deployer);
        vault.pause();

        vm.prank(alice);
        engine.claim(roundId); // must not revert due to pause
    }

    function test_closeRoundRevertsBeforeEndTime() public {
        vm.expectRevert();
        engine.closeRound();
    }

    function testFuzz_depositWithinCapNeverExceedsTotalPrincipal(uint256 amount) public {
        amount = bound(amount, 1, DEPOSIT_CAP);
        _deposit(alice, amount);
        assertEq(vault.totalPrincipal(), amount);
        assertLe(vault.totalPrincipal(), vault.depositCap());
    }
}
