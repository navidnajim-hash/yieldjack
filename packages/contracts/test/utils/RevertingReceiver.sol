// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice A contract with no `receive`/payable `fallback` — any plain native-ETH transfer to it
///         reverts. Used to prove JackFeeRouter's payouts (all ERC-20 `safeTransfer`, never a
///         native-ETH push) cannot be blocked by a hostile or merely non-payable recipient. Never
///         referenced outside the test suite.
contract RevertingReceiver { }
