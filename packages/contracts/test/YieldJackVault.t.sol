// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { TestBase } from "./utils/TestBase.sol";
import { YieldJackVault } from "../src/vault/YieldJackVault.sol";

contract YieldJackVaultTest is TestBase {
    function test_depositRoutesIntoYieldSourceAndTracksPrincipal() public {
        _deposit(alice, 1_000e6);

        assertEq(vault.principal(alice), 1_000e6);
        assertEq(vault.totalPrincipal(), 1_000e6);
        assertEq(usdg.balanceOf(address(vault)), 0, "vault should not hold idle assets");
        assertEq(yieldSource.totalAssetsOf(address(vault)), 1_000e6);
    }

    function test_withdrawReturnsAssetsDirectlyToUser() public {
        _deposit(alice, 1_000e6);

        vm.prank(alice);
        vault.withdraw(400e6);

        assertEq(vault.principal(alice), 600e6);
        assertEq(vault.totalPrincipal(), 600e6);
        assertEq(usdg.balanceOf(alice), 400e6);
    }

    function test_withdrawMoreThanPrincipalReverts() public {
        _deposit(alice, 100e6);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(YieldJackVault.InsufficientPrincipal.selector, 100e6, 101e6));
        vault.withdraw(101e6);
    }

    function test_zeroAmountDepositAndWithdrawRevert() public {
        vm.prank(alice);
        vm.expectRevert(YieldJackVault.ZeroAmount.selector);
        vault.deposit(0);

        vm.prank(alice);
        vm.expectRevert(YieldJackVault.ZeroAmount.selector);
        vault.withdraw(0);
    }

    function test_multipleUsersIndependentAccounting() public {
        _deposit(alice, 1_000e6);
        _deposit(bob, 2_500e6);

        assertEq(vault.principal(alice), 1_000e6);
        assertEq(vault.principal(bob), 2_500e6);
        assertEq(vault.totalPrincipal(), 3_500e6);

        vm.prank(alice);
        vault.withdraw(1_000e6);

        assertEq(vault.principal(alice), 0);
        assertEq(vault.principal(bob), 2_500e6);
        assertEq(vault.totalPrincipal(), 2_500e6);
    }

    function test_depositCapEnforced() public {
        vm.prank(deployer);
        vault.setDepositCap(1_000e6);

        vm.prank(deployer);
        usdg.mint(alice, 1_001e6);
        vm.startPrank(alice);
        usdg.approve(address(vault), 1_001e6);
        vm.expectRevert(abi.encodeWithSelector(YieldJackVault.DepositCapExceeded.selector, 1_001e6, 1_000e6));
        vault.deposit(1_001e6);
        vm.stopPrank();
    }

    function test_pauseBlocksDepositsButNotWithdrawals() public {
        _deposit(alice, 500e6);

        vm.prank(deployer);
        vault.pause();

        vm.prank(bob);
        vm.expectRevert();
        vault.deposit(1);

        // Withdrawals must remain available while paused.
        vm.prank(alice);
        vault.withdraw(500e6);
        assertEq(usdg.balanceOf(alice), 500e6);
    }

    function test_onlyOwnerCanPauseOrSetCap() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.pause();

        vm.prank(alice);
        vm.expectRevert();
        vault.setDepositCap(1);
    }

    function test_prizeEngineCanOnlyBeSetOnce() public {
        vm.prank(deployer);
        vm.expectRevert(YieldJackVault.PrizeEngineAlreadySet.selector);
        vault.setPrizeEngine(address(0xBEEF));
    }

    function test_onlyPrizeEngineCanPullYieldOrSnapshot() public {
        vm.expectRevert(abi.encodeWithSelector(YieldJackVault.NotPrizeEngine.selector, address(this)));
        vault.pullYield(1, address(this));

        vm.expectRevert(abi.encodeWithSelector(YieldJackVault.NotPrizeEngine.selector, address(this)));
        vault.snapshotAndReset();
    }

    function test_availableYieldExcludesPrincipal() public {
        _deposit(alice, 1_000e6);
        assertEq(vault.availableYield(), 0);

        _simulateYield(50e6);
        // ERC4626's virtual-offset rounding (favors solvency) can round this down by a wei or
        // two — see MockYieldSource.t.sol for why.
        assertApproxEqAbs(vault.availableYield(), 50e6, 2);

        // Principal itself must never appear as available yield.
        vm.prank(alice);
        vault.withdraw(1_000e6);
        assertApproxEqAbs(vault.availableYield(), 50e6, 2);
    }

    /// @notice A full withdrawal must NOT immediately drop the participant from the active set
    ///         — that would discard their already-earned weight for the current round (see
    ///         RoundBoundaryRegressions.t.sol). They are removed only as part of the next
    ///         snapshot's cleanup pass, once their weight has been recorded.
    function test_participantKeepsSlotAfterFullWithdrawalUntilNextSnapshot() public {
        _deposit(alice, 100e6);
        assertEq(vault.activeParticipantCount(), 1);

        vm.prank(alice);
        vault.withdraw(100e6);
        assertEq(vault.activeParticipantCount(), 1, "must stay active until the next snapshot");
        assertEq(vault.principal(alice), 0);

        vm.prank(address(engine));
        vault.snapshotAndReset();
        assertEq(vault.activeParticipantCount(), 0, "zero-principal participant must be cleaned up at snapshot");
    }

    function test_participantCapEnforced() public {
        uint256 cap = vault.MAX_PARTICIPANTS();
        for (uint256 i = 0; i < cap; i++) {
            address user = address(uint160(0x1000 + i));
            _deposit(user, 1e6);
        }
        assertEq(vault.activeParticipantCount(), cap);

        address overflowUser = address(uint160(0x1000 + cap));
        vm.prank(deployer);
        usdg.mint(overflowUser, 1e6);
        vm.startPrank(overflowUser);
        usdg.approve(address(vault), 1e6);
        vm.expectRevert(abi.encodeWithSelector(YieldJackVault.ParticipantCapReached.selector, cap));
        vault.deposit(1e6);
        vm.stopPrank();
    }

    /// @notice A deposit made immediately before round close must accrue far less weight-seconds
    ///         than an equal deposit held for the entire round — this is the core fairness
    ///         property of the time-weighted eligibility model.
    function test_lateDepositReceivesLessWeightThanEarlyDeposit() public {
        uint256 t0 = vault.accrualWindowStart();

        _deposit(alice, 1_000e6); // deposits at t0, holds for the full round
        vm.warp(t0 + 1800);
        _deposit(bob, 1_000e6); // deposits halfway through, holds for half the round

        uint256 roundEnd = t0 + ROUND_DURATION;
        vm.warp(roundEnd);

        vm.prank(address(engine));
        (address[] memory participants, uint256[] memory weights, uint256 totalWeight) = vault.snapshotAndReset();

        uint256 aliceWeight;
        uint256 bobWeight;
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] == alice) aliceWeight = weights[i];
            if (participants[i] == bob) bobWeight = weights[i];
        }

        assertEq(aliceWeight, 1_000e6 * ROUND_DURATION);
        assertEq(bobWeight, 1_000e6 * (ROUND_DURATION - 1800));
        assertEq(totalWeight, aliceWeight + bobWeight);
        assertGt(aliceWeight, bobWeight, "equal-sized late deposit must weigh less");
    }

    /// @notice A round closed "late" (after its scheduled `endTime`) snapshots at the actual
    ///         close timestamp — not the scheduled `endTime` — so time between the two never
    ///         goes missing (and, per RoundBoundaryRegressions.t.sol, never leaks into the
    ///         round being closed either). Two consecutive close calls must exactly partition
    ///         the elapsed time with no gap and no double-count.
    function test_lateCloseAccountsForFullElapsedTimeAcrossConsecutiveSnapshots() public {
        uint256 t0 = vault.accrualWindowStart();
        _deposit(alice, 1_000e6);

        uint256 roundEnd = t0 + ROUND_DURATION;
        // Close is called a bit late — 100 seconds after the scheduled round end.
        vm.warp(roundEnd + 100);
        vm.prank(address(engine));
        (, uint256[] memory firstWeights,) = vault.snapshotAndReset();
        assertEq(firstWeights[0], 1_000e6 * (ROUND_DURATION + 100), "late close must account for the full period");

        // A second close 500 seconds later must cover exactly that 500-second window — nothing
        // from before the first snapshot, nothing missing.
        vm.warp(roundEnd + 100 + 500);
        vm.prank(address(engine));
        (, uint256[] memory secondWeights,) = vault.snapshotAndReset();
        assertEq(secondWeights[0], 1_000e6 * 500);
    }
}
