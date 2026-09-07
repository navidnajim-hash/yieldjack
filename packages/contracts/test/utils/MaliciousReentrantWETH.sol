// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Test-only WETH-shaped ERC20 whose `transfer` calls back into an attacker contract
///         mid-transfer, used solely to prove JackStakingRewards.claimReward's reentrancy guard
///         holds. Mirrors MaliciousReentrantToken.sol's pattern. Never referenced outside the
///         test suite.
contract MaliciousReentrantWETH is ERC20 {
    address public attacker;
    bool public armed;

    constructor() ERC20("Malicious WETH", "EVILWETH") { }

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function arm(address attacker_) external {
        attacker = attacker_;
        armed = true;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (armed && to == attacker) {
            armed = false;
            IWETHAttacker(attacker).reenter();
        }
        return super.transfer(to, amount);
    }
}

interface IWETHAttacker {
    function reenter() external;
}
