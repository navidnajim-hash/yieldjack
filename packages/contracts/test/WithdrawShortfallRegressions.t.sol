// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { TestBase } from "./utils/TestBase.sol";

/// @notice Regression tests for a bug found in independent review: `withdraw(assets)` always
///         decreased `principal` (and `totalPrincipal`) by the full `assets` requested, even
///         when the yield source could only actually pay out `min(assets, vaultClaim)` — either
///         from ordinary ERC-4626 floor-rounding dust, or (more seriously) from an actual loss
///         of value in the yield source. An unpaid remainder must never be silently erased from
///         a user's recorded principal.
contract WithdrawShortfallRegressionsTest is TestBase {
    /// @dev Measures what a withdrawal actually paid via the wallet balance delta rather than
    ///      relying on `withdraw`'s return value, so this test is meaningful both before and
    ///      after the fix adds a `returns (uint256 paid)` to the function.
    function _withdrawAndMeasurePaid(address user, uint256 assets) internal returns (uint256 paid) {
        uint256 before = usdg.balanceOf(user);
        vm.prank(user);
        vault.withdraw(assets);
        paid = usdg.balanceOf(user) - before;
    }

    /// @notice An extreme (but pool-relative-cap-legal) yield injection against a tiny deposit
    ///         produces a real ERC-4626 floor-rounding shortfall. `withdraw` must reduce
    ///         principal only by what was actually paid, not by the full amount requested.
    function test_withdrawRoundingShortfallDoesNotErasePrincipal() public {
        // Two depositors so the pool is large enough for a big relative yield injection to
        // still leave a floor-rounding shortfall specifically on the tiny second depositor.
        _deposit(alice, 10_000e6);
        _simulateYield(10_000e6); // doubles the pool; legal under the pool-relative cap.
        _deposit(bob, 1e6); // tiny depositor, minted post-yield so their share count is small.

        uint256 bobPrincipalBefore = vault.principal(bob);
        assertEq(bobPrincipalBefore, 1e6);

        uint256 paid = _withdrawAndMeasurePaid(bob, 1e6);

        uint256 bobPrincipalAfter = vault.principal(bob);

        // Whatever wasn't paid must still be recorded as principal — never silently dropped.
        assertEq(bobPrincipalAfter, bobPrincipalBefore - paid, "unpaid remainder vanished from principal");
    }

    /// @notice A real loss of value in the yield source (not just rounding dust) must leave the
    ///         unpaid remainder on the books rather than erasing it.
    function test_withdrawSurvivesModeledYieldSourceLoss() public {
        _deposit(alice, 1_000e6);

        // Model an actual loss: directly drain some of the yield source's real backing balance
        // (as if the venue it deployed into lost funds), independent of the vault's own
        // accounting, which still believes `alice` is owed her full 1_000e6.
        vm.prank(address(yieldSource));
        usdg.transfer(address(0xdead), 400e6);

        uint256 vaultClaim = yieldSource.totalAssetsOf(address(vault));
        assertLt(vaultClaim, 1_000e6, "test setup: loss must actually reduce the vault's claim");

        uint256 paid = _withdrawAndMeasurePaid(alice, 1_000e6);

        assertEq(paid, vaultClaim, "should have paid out exactly the vault's real remaining claim");
        assertLt(paid, 1_000e6, "test setup: this withdrawal must be underpaid to exercise the bug");

        uint256 remaining = vault.principal(alice);
        assertEq(remaining, 1_000e6 - paid, "unpaid remainder after a real loss must stay recorded as principal");
    }

    /// @notice A withdrawal that can be paid nothing at all (total loss) must not silently
    ///         erase the user's principal — this is the sharpest form of the bug.
    function test_zeroPaymentWithdrawalDoesNotErasePrincipal() public {
        _deposit(alice, 1_000e6);

        // Drain the yield source completely.
        uint256 totalBal = usdg.balanceOf(address(yieldSource));
        vm.prank(address(yieldSource));
        usdg.transfer(address(0xdead), totalBal);
        assertEq(yieldSource.totalAssetsOf(address(vault)), 0);

        uint256 paid = _withdrawAndMeasurePaid(alice, 1_000e6);

        assertEq(paid, 0, "test setup: this withdrawal must pay nothing to exercise the bug");
        assertEq(vault.principal(alice), 1_000e6, "a zero-payment withdrawal erased the user's principal");
    }
}
