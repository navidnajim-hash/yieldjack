// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Minimal mintable ERC-20 test double used as a generic stand-in for real $JACK in the
///         JackStakingRewards/JackFeeRouter test suite. Deliberately NOT MockJACK (see that
///         contract's own NatSpec): these tests exercise real-JACK infrastructure and must stay
///         fully decoupled from the testnet-demo mock-token code path. Never referenced outside
///         the test suite.
contract TestERC20 is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) { }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
