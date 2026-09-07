// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Test-only ERC20 whose `transfer` calls back into an attacker contract mid-transfer,
///         used solely to prove `YieldJackVault`'s reentrancy guard holds. Never referenced
///         outside the test suite.
contract MaliciousReentrantToken is ERC20 {
    address public attacker;
    bool public armed;

    constructor() ERC20("Malicious", "EVIL") { }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function arm(address attacker_) external {
        attacker = attacker_;
        armed = true;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (armed && to == attacker) {
            armed = false;
            IAttacker(attacker).reenter();
        }
        return super.transfer(to, amount);
    }
}

interface IAttacker {
    function reenter() external;
}
