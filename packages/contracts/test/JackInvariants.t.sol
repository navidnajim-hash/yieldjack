// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { StdInvariant } from "forge-std/StdInvariant.sol";

import { JackTestBase } from "./utils/JackTestBase.sol";
import { JackStakingRewards } from "../src/staking/JackStakingRewards.sol";
import { TestERC20 } from "./utils/TestERC20.sol";

/// @notice A bounded, randomized handler driving stakes, withdrawals, claims, fee harvests,
///         direct-donation attempts, pause toggles, and time advancement, used to fuzz for
///         accounting-invariant violations across JackStakingRewards + JackFeeRouter together.
contract Handler is JackTestBase {
    address[] internal actors;

    uint256 public callCount;
    uint256 public totalStakerWethIn;
    uint256 public totalStakerWethOut;
    uint256 public totalDonatedWeth;

    function setUp() public override {
        super.setUp();
        actors.push(alice);
        actors.push(bob);
        actors.push(carol);
    }

    function stake(uint256 actorSeed, uint256 amount) external {
        callCount++;
        address user = actors[actorSeed % actors.length];
        amount = bound(amount, 1, 1_000_000 ether);

        vm.startPrank(deployer);
        jack.mint(user, amount);
        vm.stopPrank();

        vm.startPrank(user);
        jack.approve(address(staking), amount);
        try staking.stake(amount) { } catch { }
        vm.stopPrank();
    }

    function withdraw(uint256 actorSeed, uint256 amount) external {
        callCount++;
        address user = actors[actorSeed % actors.length];
        uint256 bal = staking.balanceOf(user);
        if (bal == 0) return;
        amount = bound(amount, 1, bal);

        vm.prank(user);
        try staking.withdraw(amount) { } catch { }
    }

    function claimReward(uint256 actorSeed) external {
        callCount++;
        address user = actors[actorSeed % actors.length];
        uint256 before = weth.balanceOf(address(staking));

        vm.prank(user);
        try staking.claimReward() {
            uint256 afterBal = weth.balanceOf(address(staking));
            totalStakerWethOut += (before - afterBal);
        } catch { }
    }

    function harvestFee(uint256 amount) external {
        callCount++;
        amount = bound(amount, 0, 1000 ether);
        if (amount == 0) return;
        _creditFee(amount);

        uint256 before = weth.balanceOf(address(staking));
        try router.harvest() {
            uint256 afterBal = weth.balanceOf(address(staking));
            if (afterBal > before) totalStakerWethIn += (afterBal - before);
        } catch { }
    }

    function donateWeth(uint256 amount) external {
        callCount++;
        amount = bound(amount, 0, 100 ether);
        if (amount == 0) return;
        vm.deal(address(this), amount);
        weth.deposit{ value: amount }();
        weth.transfer(address(staking), amount);
        totalDonatedWeth += amount;
    }

    function donateJack(uint256 amount) external {
        callCount++;
        amount = bound(amount, 0, 1_000_000 ether);
        if (amount == 0) return;
        jack.mint(address(this), amount);
        jack.transfer(address(staking), amount);
    }

    function togglePause(bool doPause) external {
        callCount++;
        vm.startPrank(deployer);
        if (doPause) {
            try staking.pause() { } catch { }
        } else {
            try staking.unpause() { } catch { }
        }
        vm.stopPrank();
    }

    function advanceTime(uint256 warpSeed) external {
        callCount++;
        uint256 dt = bound(warpSeed, 0, 3 days);
        vm.warp(block.timestamp + dt);
    }

    function actorCount() external view returns (uint256) {
        return actors.length;
    }

    function actorAt(uint256 i) external view returns (address) {
        return actors[i];
    }
}

contract JackInvariantsTest is StdInvariant, Test {
    Handler internal handler;

    function setUp() public {
        handler = new Handler();
        handler.setUp();
        targetContract(address(handler));

        bytes4[] memory selectors = new bytes4[](8);
        selectors[0] = Handler.stake.selector;
        selectors[1] = Handler.withdraw.selector;
        selectors[2] = Handler.claimReward.selector;
        selectors[3] = Handler.harvestFee.selector;
        selectors[4] = Handler.donateWeth.selector;
        selectors[5] = Handler.donateJack.selector;
        selectors[6] = Handler.togglePause.selector;
        selectors[7] = Handler.advanceTime.selector;
        targetSelector(FuzzSelector({ addr: address(handler), selectors: selectors }));
    }

    /// @notice `staking`'s WETH balance must always equal exactly what handler-tracked flows say
    ///         it should: every harvest-driven inflow and every direct donation, minus every
    ///         claim-driven outflow. Unlike ERC-4626 share accounting elsewhere in this repo,
    ///         nothing here introduces rounding at the transfer level, so this holds exactly, not
    ///         just approximately.
    function invariant_wethBalanceMatchesTrackedFlows() public view {
        uint256 expected = handler.totalStakerWethIn() + handler.totalDonatedWeth() - handler.totalStakerWethOut();
        assertEq(handler.weth().balanceOf(address(handler.staking())), expected);
    }

    /// @notice No actor's claimable balance can ever exceed what the contract actually holds —
    ///         rewards can never exceed funded WETH.
    function invariant_earnedNeverExceedsWethBalance() public view {
        JackStakingRewards s = handler.staking();
        uint256 n = handler.actorCount();
        uint256 totalEarned;
        for (uint256 i = 0; i < n; i++) {
            totalEarned += s.earned(handler.actorAt(i));
        }
        assertLe(totalEarned, handler.weth().balanceOf(address(s)));
    }

    /// @notice `totalStaked` is always exactly the sum of every actor's own tracked balance —
    ///         direct JACK donations (see `Handler.donateJack`) never leak into it.
    function invariant_totalStakedMatchesSumOfBalances() public view {
        JackStakingRewards s = handler.staking();
        uint256 n = handler.actorCount();
        uint256 sum;
        for (uint256 i = 0; i < n; i++) {
            sum += s.balanceOf(handler.actorAt(i));
        }
        assertEq(sum, s.totalStaked());
    }

    /// @notice The core zero-staker-queuing invariant: whenever nobody is staked, the reward
    ///         stream must be paused (rate zero), never silently ticking down for nobody to earn.
    function invariant_zeroStakedImpliesZeroRewardRate() public view {
        JackStakingRewards s = handler.staking();
        if (s.totalStaked() == 0) {
            assertEq(s.rewardRate(), 0);
        }
    }

    /// @notice Every actor must always be able to fully withdraw their staked JACK — principal is
    ///         never silently consumed by reward accounting, and a direct JACK donation (see
    ///         `Handler.donateJack`) never makes their own stake harder to withdraw.
    function invariant_everyActorCanWithdrawTheirFullStake() public {
        JackStakingRewards s = handler.staking();
        TestERC20 j = handler.jack();
        uint256 n = handler.actorCount();

        for (uint256 i = 0; i < n; i++) {
            address actor = handler.actorAt(i);
            uint256 bal = s.balanceOf(actor);
            if (bal == 0) continue;

            uint256 before = j.balanceOf(actor);
            vm.prank(actor);
            s.withdraw(bal);
            assertEq(j.balanceOf(actor) - before, bal, "withdraw paid out less than the full staked balance");

            // Re-stake so later invariant calls and the fuzzer can keep going. May legitimately
            // fail if stake() is currently paused — that is not itself an invariant violation.
            vm.startPrank(actor);
            j.approve(address(s), bal);
            try s.stake(bal) { } catch { }
            vm.stopPrank();
        }
    }
}
