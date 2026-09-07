// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IPonsV2FeeEscrow } from "./IPonsV2FeeEscrow.sol";

/// @notice Fee terms frozen for one launch when its curve is created and its graduated pool is
///         registered. Copied verbatim from pons V2 source — see IPonsV2FeeEscrow.sol for the
///         pinned commit and attribution.
struct FeePolicySnapshot {
    address protocolFeeRecipient;
    uint16 protocolFeeShareBps;
    uint16 buybackBurnBps;
    uint16 hookFeeBps;
    uint16 maxInternalPriceImpactBps;
}

/// @title IPonsV2FeePolicy
/// @notice Minimal interface for pons V2's protocol-owned fee policy, implemented by the meme
///         hook returned from `IPonsV2LaunchFactory.memeHook()`. Used only by this repository's
///         read-only reporting script (script/PrintPonsV2State.s.sol) — JackFeeRouter itself
///         never reads pons's internal fee split, since it only ever claims whatever native ETH
///         the fee escrow already credits to its own address. See IPonsV2FeeEscrow.sol for the
///         pinned commit and attribution.
interface IPonsV2FeePolicy {
    function protocolFeeShareBps() external view returns (uint256);
    function buybackBurnBps() external view returns (uint256);
    function protocolFeeRecipient() external view returns (address);
    function feeEscrow() external view returns (IPonsV2FeeEscrow);
    function maxInternalPriceImpactBps() external view returns (uint256);
    function feeSweepOperator() external view returns (address);
    function currentFeePolicy() external view returns (FeePolicySnapshot memory);
}
