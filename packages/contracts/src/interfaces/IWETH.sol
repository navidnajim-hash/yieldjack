// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title IWETH
/// @notice Minimal WETH9 interface: standard ERC-20 plus the ability to wrap native ETH.
///         JackFeeRouter wraps its claimed native-ETH creator fees into WETH before splitting and
///         distributing them, so every downstream recipient (JackStakingRewards in particular)
///         only ever handles one boring ERC-20 instead of a mix of native ETH and wrapped ETH.
interface IWETH is IERC20 {
    function deposit() external payable;
}
