// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { YieldJackVault } from "../src/vault/YieldJackVault.sol";
import { MockYieldSource } from "../src/yield/MockYieldSource.sol";
import { IYieldSource } from "../src/interfaces/IYieldSource.sol";
import { MaliciousReentrantToken, IAttacker } from "./utils/MaliciousReentrantToken.sol";

/// @notice A minimal attacker contract that, when the malicious token calls back into it mid
///         `transfer`, tries to re-enter `YieldJackVault.withdraw`. Exists purely to prove the
///         vault's `nonReentrant` guard holds.
contract WithdrawAttacker is IAttacker {
    YieldJackVault public immutable vault;
    bool public reentered;

    constructor(YieldJackVault vault_) {
        vault = vault_;
    }

    function depositInto(IERC20 token, uint256 amount) external {
        token.approve(address(vault), amount);
        vault.deposit(amount);
    }

    function attack(uint256 amount) external {
        vault.withdraw(amount);
    }

    function reenter() external {
        if (reentered) return;
        reentered = true;
        vault.withdraw(1e6);
    }
}

contract ReentrancyTest is Test {
    function test_reentrantWithdrawReverts() public {
        MaliciousReentrantToken token = new MaliciousReentrantToken();
        MockYieldSource maliciousYieldSource = new MockYieldSource(IERC20(address(token)));
        YieldJackVault vault =
            new YieldJackVault(IYieldSource(address(maliciousYieldSource)), 1_000_000e6, address(this));
        WithdrawAttacker attacker = new WithdrawAttacker(vault);

        token.mint(address(attacker), 200e6);
        token.arm(address(attacker));

        vm.prank(address(attacker));
        attacker.depositInto(token, 200e6);

        // Withdrawing triggers a token transfer to the attacker, which re-enters `withdraw`
        // mid-call. The reentrancy guard must cause the entire outer call to revert.
        vm.prank(address(attacker));
        vm.expectRevert();
        attacker.attack(100e6);

        // No funds should have moved, and principal must be untouched.
        assertEq(vault.principal(address(attacker)), 200e6);
        assertEq(token.balanceOf(address(attacker)), 0);
    }
}
