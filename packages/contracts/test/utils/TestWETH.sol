// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Minimal WETH9-shaped test double (deposit-only — nothing in this repository ever
///         calls `withdraw`) used by the JackStakingRewards/JackFeeRouter test suite in place of
///         Robinhood Chain's real canonical WETH. Never referenced outside the test suite.
contract TestWETH is ERC20 {
    constructor() ERC20("Test Wrapped Ether", "tWETH") { }

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    receive() external payable {
        _mint(msg.sender, msg.value);
    }
}
