// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { TestBase } from "./utils/TestBase.sol";
import { MockYieldSource } from "../src/yield/MockYieldSource.sol";

contract MockYieldSourceTest is TestBase {
    function test_depositAndWithdrawRoundTrip() public {
        vm.prank(deployer);
        usdg.mint(alice, 1_000e6);

        vm.startPrank(alice);
        usdg.approve(address(yieldSource), 1_000e6);
        yieldSource.deposit(1_000e6, alice);
        assertEq(yieldSource.totalAssetsOf(alice), 1_000e6);

        yieldSource.withdraw(1_000e6, alice, alice);
        vm.stopPrank();

        assertEq(usdg.balanceOf(alice), 1_000e6);
        assertEq(yieldSource.totalAssetsOf(alice), 0);
    }

    function test_simulateYieldIncreasesRedeemableValue() public {
        vm.prank(deployer);
        usdg.mint(alice, 1_000e6);

        vm.startPrank(alice);
        usdg.approve(address(yieldSource), 1_000e6);
        yieldSource.deposit(1_000e6, alice);
        vm.stopPrank();

        yieldSource.simulateYield(100e6);

        // Alice owns 100% of shares, so all simulated yield accrues to her redeemable value.
        // ERC4626's virtual-offset share math (OpenZeppelin's inflation-attack mitigation)
        // rounds asset conversions down by a wei or two — consistent with this project's
        // "rounding favors protocol solvency" rule, so we assert within a tight tolerance
        // rather than exact equality.
        assertApproxEqAbs(yieldSource.totalAssetsOf(alice), 1_100e6, 2);
        assertEq(yieldSource.totalAssets(), 1_100e6);
    }

    function test_simulateYieldRevertsAboveAbsoluteCap() public {
        // Deposit at least the absolute cap so the pool-relative cap (== totalAssets) is not
        // the binding constraint here — this test targets the flat MAX_SIMULATED_YIELD_PER_CALL
        // ceiling specifically.
        uint256 absoluteCap = yieldSource.MAX_SIMULATED_YIELD_PER_CALL();
        vm.prank(deployer);
        usdg.mint(alice, absoluteCap);
        vm.startPrank(alice);
        usdg.approve(address(yieldSource), absoluteCap);
        yieldSource.deposit(absoluteCap, alice);
        vm.stopPrank();

        vm.expectRevert(
            abi.encodeWithSelector(MockYieldSource.SimulatedYieldTooLarge.selector, absoluteCap + 1, absoluteCap)
        );
        yieldSource.simulateYield(absoluteCap + 1);
    }

    /// @notice A tiny pool must not be able to have its share price skewed by a
    ///         disproportionately huge single yield injection — real yield is proportional to
    ///         the pool it grows, so the effective cap must scale down with `totalAssets()`.
    function test_simulateYieldRevertsAbovePoolRelativeCap() public {
        vm.prank(deployer);
        usdg.mint(alice, 1e6);
        vm.startPrank(alice);
        usdg.approve(address(yieldSource), 1e6);
        yieldSource.deposit(1e6, alice);
        vm.stopPrank();

        // Pool is only 1e6; the relative cap (== totalAssets()) is far below the absolute
        // MAX_SIMULATED_YIELD_PER_CALL ceiling.
        vm.expectRevert(abi.encodeWithSelector(MockYieldSource.SimulatedYieldTooLarge.selector, 2e6, 1e6));
        yieldSource.simulateYield(2e6);

        // Exactly doubling the pool in one call is allowed.
        yieldSource.simulateYield(1e6);
        assertApproxEqAbs(yieldSource.totalAssets(), 2e6, 1);
    }

    function test_simulateYieldRevertsWithNoSharesOutstanding() public {
        vm.expectRevert(MockYieldSource.NoSharesOutstanding.selector);
        yieldSource.simulateYield(1e6);
    }

    function test_yieldSharedProportionallyAcrossDepositors() public {
        vm.startPrank(deployer);
        usdg.mint(alice, 1_000e6);
        usdg.mint(bob, 3_000e6);
        vm.stopPrank();

        vm.startPrank(alice);
        usdg.approve(address(yieldSource), 1_000e6);
        yieldSource.deposit(1_000e6, alice);
        vm.stopPrank();

        vm.startPrank(bob);
        usdg.approve(address(yieldSource), 3_000e6);
        yieldSource.deposit(3_000e6, bob);
        vm.stopPrank();

        yieldSource.simulateYield(400e6);

        // Pool is 4,000 total; Alice owns 25% -> +100, Bob owns 75% -> +300 (within ERC4626's
        // few-wei rounding-down tolerance — see the comment in the test above).
        assertApproxEqAbs(yieldSource.totalAssetsOf(alice), 1_100e6, 5);
        assertApproxEqAbs(yieldSource.totalAssetsOf(bob), 3_300e6, 5);
    }
}
