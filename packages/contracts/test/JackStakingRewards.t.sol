// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { JackTestBase } from "./utils/JackTestBase.sol";
import { JackStakingRewards } from "../src/staking/JackStakingRewards.sol";
import { TestERC20 } from "./utils/TestERC20.sol";

contract JackStakingRewardsTest is JackTestBase {
    uint256 internal constant DURATION = 7 days;

    // ---------------------------------------------------------------------
    // Construction
    // ---------------------------------------------------------------------

    function test_constructor_revertsOnZeroAddresses() public {
        vm.expectRevert(JackStakingRewards.ZeroAddress.selector);
        new JackStakingRewards(IERC20(address(0)), weth, address(router), deployer);

        vm.expectRevert(JackStakingRewards.ZeroAddress.selector);
        new JackStakingRewards(jack, IERC20(address(0)), address(router), deployer);

        vm.expectRevert(JackStakingRewards.ZeroAddress.selector);
        new JackStakingRewards(jack, weth, address(0), deployer);
    }

    function test_constructor_setsImmutables() public view {
        assertEq(address(staking.stakingToken()), address(jack));
        assertEq(address(staking.rewardToken()), address(weth));
        assertEq(staking.distributor(), address(router));
    }

    // ---------------------------------------------------------------------
    // Staking / withdrawing
    // ---------------------------------------------------------------------

    function test_stake_updatesBalancesAndPullsToken() public {
        jack.mint(alice, 100 ether);
        vm.startPrank(alice);
        jack.approve(address(staking), 100 ether);
        staking.stake(100 ether);
        vm.stopPrank();

        assertEq(staking.balanceOf(alice), 100 ether);
        assertEq(staking.totalStaked(), 100 ether);
        assertEq(jack.balanceOf(address(staking)), 100 ether);
        assertEq(jack.balanceOf(alice), 0);
    }

    function test_stake_revertsOnZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(JackStakingRewards.ZeroAmount.selector);
        staking.stake(0);
    }

    function test_stake_revertsWhenPaused() public {
        vm.prank(deployer);
        staking.pause();

        jack.mint(alice, 1 ether);
        vm.startPrank(alice);
        jack.approve(address(staking), 1 ether);
        vm.expectRevert();
        staking.stake(1 ether);
        vm.stopPrank();
    }

    function test_withdraw_alwaysAvailableWhilePaused() public {
        _stake(alice, 100 ether);

        vm.prank(deployer);
        staking.pause();

        vm.prank(alice);
        staking.withdraw(100 ether);

        assertEq(jack.balanceOf(alice), 100 ether);
        assertEq(staking.totalStaked(), 0);
    }

    function test_withdraw_partial() public {
        _stake(alice, 100 ether);

        vm.prank(alice);
        staking.withdraw(40 ether);

        assertEq(staking.balanceOf(alice), 60 ether);
        assertEq(staking.totalStaked(), 60 ether);
        assertEq(jack.balanceOf(alice), 40 ether);
    }

    function test_withdraw_revertsOnZeroAmount() public {
        _stake(alice, 100 ether);
        vm.prank(alice);
        vm.expectRevert(JackStakingRewards.ZeroAmount.selector);
        staking.withdraw(0);
    }

    function test_withdraw_revertsWhenInsufficientBalance() public {
        _stake(alice, 100 ether);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(JackStakingRewards.InsufficientBalance.selector, 101 ether, 100 ether));
        staking.withdraw(101 ether);
    }

    function test_exit_withdrawsAndClaims() public {
        _stake(alice, 100 ether);

        _fundAndNotify(DURATION * 1 ether);
        vm.warp(block.timestamp + DURATION);

        vm.prank(alice);
        staking.exit();

        assertEq(staking.balanceOf(alice), 0);
        assertEq(jack.balanceOf(alice), 100 ether);
        assertApproxEqAbs(weth.balanceOf(alice), DURATION * 1 ether, DURATION);
    }

    function test_claimReward_noOpWhenNothingOwed() public {
        _stake(alice, 100 ether);
        vm.prank(alice);
        staking.claimReward();
        assertEq(weth.balanceOf(alice), 0);
    }

    // ---------------------------------------------------------------------
    // notifyRewardAmount access control
    // ---------------------------------------------------------------------

    function test_notifyRewardAmount_onlyDistributor() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(JackStakingRewards.NotDistributor.selector, alice));
        staking.notifyRewardAmount(1 ether);
    }

    function test_notifyRewardAmount_revertsOnZeroAmount() public {
        vm.prank(address(router));
        vm.expectRevert(JackStakingRewards.ZeroAmount.selector);
        staking.notifyRewardAmount(0);
    }

    function test_notifyRewardAmount_revertsIfUnderfunded() public {
        // The insufficient-balance guard only fires on the totalStaked > 0 (stream-starting)
        // path — with nobody staked, notify() queues unconditionally instead (see
        // test_notify_whileZeroStaked_queuesInsteadOfStreaming), so this needs an active staker.
        _stake(alice, 100 ether);

        // Distributor calls notify without actually transferring the WETH first.
        uint256 expectedRate = 1 ether / DURATION;
        vm.prank(address(router));
        vm.expectRevert(
            abi.encodeWithSelector(JackStakingRewards.InsufficientRewardBalance.selector, expectedRate * DURATION, 0)
        );
        staking.notifyRewardAmount(1 ether);
    }

    // ---------------------------------------------------------------------
    // Reward math
    // ---------------------------------------------------------------------

    function test_singleStaker_earnsFullStreamOverFullDuration() public {
        _stake(alice, 100 ether);
        uint256 reward = 7 ether; // exact multiple of DURATION in wei-per-second terms is not
        // required; approxEq below absorbs floor-rounding dust.
        _fundAndNotify(reward);

        vm.warp(block.timestamp + DURATION);
        assertApproxEqAbs(staking.earned(alice), reward, DURATION);

        vm.prank(alice);
        staking.claimReward();
        assertApproxEqAbs(weth.balanceOf(alice), reward, DURATION);
    }

    function test_singleStaker_earnsHalfAtHalfDuration() public {
        _stake(alice, 100 ether);
        uint256 reward = 7 ether;
        _fundAndNotify(reward);

        vm.warp(block.timestamp + DURATION / 2);
        assertApproxEqAbs(staking.earned(alice), reward / 2, DURATION);
    }

    function test_twoStakers_splitProportionally() public {
        _stake(alice, 75 ether);
        _stake(bob, 25 ether);
        uint256 reward = 4 ether;
        _fundAndNotify(reward);

        vm.warp(block.timestamp + DURATION);
        assertApproxEqAbs(staking.earned(alice), (reward * 75) / 100, DURATION);
        assertApproxEqAbs(staking.earned(bob), (reward * 25) / 100, DURATION);
    }

    /// @notice The core "stake right before a huge harvest" guarantee: a staker who joins one
    ///         second before a large notification must not receive anywhere near the whole
    ///         amount an instant later — it streams linearly over the next seven days.
    function test_stakeImmediatelyBeforeLargeHarvest_doesNotPayInstantly() public {
        _stake(alice, 1 ether);

        uint256 hugeReward = 700 ether;
        _fundAndNotify(hugeReward);

        vm.warp(block.timestamp + 1);
        uint256 earnedAfterOneSecond = staking.earned(alice);

        // Upper bound: at most a ~1-second slice of the 7-day stream, not the whole amount.
        uint256 oneSecondShare = hugeReward / DURATION + 1;
        assertLt(earnedAfterOneSecond, oneSecondShare * 2);
        assertLt(earnedAfterOneSecond, hugeReward / 1000);
    }

    function test_userJoiningMidStream_onlyEarnsFromJoinTime() public {
        _stake(alice, 100 ether);
        _fundAndNotify(7 ether);

        vm.warp(block.timestamp + DURATION / 2);
        uint256 aliceEarnedAtHalf = staking.earned(alice);

        _stake(bob, 100 ether);
        vm.warp(block.timestamp + DURATION / 2);

        // Bob only staked for the second half, alongside Alice (50/50 from that point).
        uint256 secondHalfShare = (7 ether / 2) / 2;
        assertApproxEqAbs(staking.earned(bob), secondHalfShare, DURATION);
        // Alice keeps her first-half earnings plus her half of the second half.
        assertApproxEqAbs(staking.earned(alice), aliceEarnedAtHalf + secondHalfShare, DURATION);
    }

    function test_userLeavingMidStream_stopsAccruingAfterExit() public {
        _stake(alice, 100 ether);
        _stake(bob, 100 ether);
        _fundAndNotify(7 ether);

        vm.warp(block.timestamp + DURATION / 2);
        vm.prank(alice);
        staking.exit();
        uint256 aliceFinal = weth.balanceOf(alice);

        vm.warp(block.timestamp + DURATION / 2);
        // Alice's paid-out balance must not grow after she fully exited.
        assertEq(weth.balanceOf(alice), aliceFinal);
        // Bob now earns alone for the second half, plus his half of the first half.
        assertGt(staking.earned(bob), aliceFinal);
        assertApproxEqAbs(staking.earned(bob), (7 ether * 3) / 4, DURATION);
        assertApproxEqAbs(staking.earned(bob) + aliceFinal, 7 ether, DURATION);
    }

    // ---------------------------------------------------------------------
    // Zero-staker queuing
    // ---------------------------------------------------------------------

    function test_notify_whileZeroStaked_queuesInsteadOfStreaming() public {
        _fundAndNotify(5 ether);

        assertEq(staking.queuedRewards(), 5 ether);
        assertEq(staking.rewardRate(), 0);
        assertEq(staking.periodFinish(), 0);
    }

    function test_notify_whileZeroStaked_multipleHarvestsAccumulate() public {
        _fundAndNotify(2 ether);
        _fundAndNotify(3 ether);
        assertEq(staking.queuedRewards(), 5 ether);
    }

    function test_firstStakeAfterQueuing_startsFreshStream() public {
        _fundAndNotify(7 ether);
        assertEq(staking.queuedRewards(), 7 ether);

        _stake(alice, 100 ether);
        assertEq(staking.queuedRewards(), 0);
        assertApproxEqAbs(staking.periodFinish(), block.timestamp + DURATION, 1);

        vm.warp(block.timestamp + DURATION);
        assertApproxEqAbs(staking.earned(alice), 7 ether, DURATION);
    }

    function test_lastStakerLeaving_queuesRemainderInsteadOfLosingIt() public {
        _stake(alice, 100 ether);
        _fundAndNotify(7 ether);

        vm.warp(block.timestamp + DURATION / 2);
        vm.prank(alice);
        staking.withdraw(100 ether);

        uint256 alicePaidWETH = staking.earned(alice);
        uint256 queued = staking.queuedRewards();
        assertApproxEqAbs(queued, 7 ether / 2, DURATION);
        assertEq(staking.rewardRate(), 0);

        // Nothing is lost: what Alice already earned plus what got re-queued accounts for the
        // full original notification (within floor-rounding dust).
        assertApproxEqAbs(alicePaidWETH + queued, 7 ether, DURATION);

        // A new staker later picks up the queued remainder in a fresh stream.
        _stake(bob, 100 ether);
        vm.warp(block.timestamp + DURATION);
        assertApproxEqAbs(staking.earned(bob), queued, DURATION);
    }

    // ---------------------------------------------------------------------
    // Reward top-ups mid-stream
    // ---------------------------------------------------------------------

    function test_secondNotifyDuringActiveStream_combinesRemainderWithNewAmount() public {
        _stake(alice, 100 ether);
        _fundAndNotify(7 ether);

        vm.warp(block.timestamp + DURATION / 2);
        uint256 remainderBefore = staking.activeStreamRemaining();

        _fundAndNotify(7 ether);
        assertApproxEqAbs(staking.getRewardForDuration(), remainderBefore + 7 ether, DURATION);

        vm.warp(block.timestamp + DURATION);
        // Alice held 100% of totalStaked throughout, across both notifications, so by the time
        // the (restarted) second stream fully completes she has earned everything ever notified:
        // the original 7 plus the second 7 — not just the second stream's own combined total.
        // Two notify() calls each contribute up to just under `DURATION` wei of floor-rounding
        // dust, so the tolerance scales with the number of notifications.
        assertApproxEqAbs(staking.earned(alice), 14 ether, 2 * DURATION);
    }

    // ---------------------------------------------------------------------
    // Pause
    // ---------------------------------------------------------------------

    function test_pause_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        staking.pause();
    }

    function test_unpause_onlyOwner() public {
        vm.prank(deployer);
        staking.pause();

        vm.prank(alice);
        vm.expectRevert();
        staking.unpause();
    }

    // ---------------------------------------------------------------------
    // Rescue
    // ---------------------------------------------------------------------

    function test_rescue_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        staking.rescue(jack, alice, 1);
    }

    function test_rescue_revertsForStakingToken() public {
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSelector(JackStakingRewards.CannotRescueProtocolToken.selector, address(jack)));
        staking.rescue(jack, deployer, 1);
    }

    function test_rescue_revertsForRewardToken() public {
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSelector(JackStakingRewards.CannotRescueProtocolToken.selector, address(weth)));
        staking.rescue(weth, deployer, 1);
    }

    function test_rescue_worksForUnrelatedToken() public {
        TestERC20 randomToken = new TestERC20("Random", "RND");
        randomToken.mint(address(staking), 500 ether);

        vm.prank(deployer);
        staking.rescue(randomToken, deployer, 500 ether);

        assertEq(randomToken.balanceOf(deployer), 500 ether);
    }

    // ---------------------------------------------------------------------
    // Direct donations never corrupt accounting
    // ---------------------------------------------------------------------

    function test_directJackDonation_neverCreditedToAnyStaker() public {
        _stake(alice, 100 ether);

        jack.mint(address(this), 50 ether);
        jack.transfer(address(staking), 50 ether);

        assertEq(staking.totalStaked(), 100 ether);
        assertEq(staking.balanceOf(alice), 100 ether);
        assertEq(jack.balanceOf(address(staking)), 150 ether);

        // Alice can still only withdraw exactly what she staked; the donated 50 is unreachable
        // through withdraw().
        vm.prank(alice);
        staking.withdraw(100 ether);
        assertEq(jack.balanceOf(alice), 100 ether);
    }

    function test_directWethDonation_neverStreamedToAnyone() public {
        _stake(alice, 100 ether);

        vm.deal(address(this), 10 ether);
        weth.deposit{ value: 10 ether }();
        weth.transfer(address(staking), 10 ether);

        vm.warp(block.timestamp + DURATION);
        assertEq(staking.earned(alice), 0);
    }

    // ---------------------------------------------------------------------
    // Fuzz
    // ---------------------------------------------------------------------

    function testFuzz_earnedNeverExceedsFundedReward(uint256 stakeAmount, uint256 reward, uint256 warpTime) public {
        stakeAmount = bound(stakeAmount, 1, 1_000_000 ether);
        reward = bound(reward, DURATION, 1_000_000 ether); // at least 1 wei/sec so rate > 0
        warpTime = bound(warpTime, 0, DURATION * 3);

        _stake(alice, stakeAmount);
        _fundAndNotify(reward);

        vm.warp(block.timestamp + warpTime);
        assertLe(staking.earned(alice), reward);
    }

    function testFuzz_totalEarnedAcrossStakersNeverExceedsFundedReward(
        uint256 aliceAmount,
        uint256 bobAmount,
        uint256 reward,
        uint256 warpTime
    ) public {
        aliceAmount = bound(aliceAmount, 1, 1_000_000 ether);
        bobAmount = bound(bobAmount, 1, 1_000_000 ether);
        reward = bound(reward, DURATION, 1_000_000 ether);
        warpTime = bound(warpTime, 0, DURATION * 2);

        _stake(alice, aliceAmount);
        _stake(bob, bobAmount);
        _fundAndNotify(reward);

        vm.warp(block.timestamp + warpTime);
        assertLe(staking.earned(alice) + staking.earned(bob), reward + 1);
    }

    function testFuzz_withdrawNeverExceedsStakedAmount(uint256 amount, uint256 withdrawAmount) public {
        amount = bound(amount, 1, 1_000_000 ether);
        _stake(alice, amount);

        withdrawAmount = bound(withdrawAmount, amount + 1, type(uint128).max);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(JackStakingRewards.InsufficientBalance.selector, withdrawAmount, amount));
        staking.withdraw(withdrawAmount);
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /// @dev Funds `staking` with `amount` WETH (as if JackFeeRouter had wrapped and forwarded a
    ///      harvest) and calls `notifyRewardAmount` as the distributor, exactly the push-then-
    ///      notify sequence JackFeeRouter.harvest() performs.
    function _fundAndNotify(uint256 amount) internal {
        vm.deal(address(this), amount);
        weth.deposit{ value: amount }();
        weth.transfer(address(staking), amount);

        vm.prank(address(router));
        staking.notifyRewardAmount(amount);
    }
}
