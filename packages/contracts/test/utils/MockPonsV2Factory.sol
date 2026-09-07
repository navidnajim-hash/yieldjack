// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IPonsV2FeeEscrow } from "../../src/interfaces/IPonsV2FeeEscrow.sol";
import {
    IPonsV2LaunchFactory,
    LaunchedToken,
    LaunchConfig,
    PonsV2TokenParams
} from "../../src/interfaces/IPonsV2LaunchFactory.sol";

/// @notice Minimal stand-in for pons V2's `PonsV2LaunchFactory`, used only to unit-test
///         JackFeeRouter.configureJack() without a live fork (see JackRobinhoodMainnetFork.t.sol
///         for a test against the real, deployed factory). Lets a test register a launched
///         token's record directly via `setLaunchedToken` rather than running a real
///         bonding-curve launch. Never referenced outside the test suite.
contract MockPonsV2Factory is IPonsV2LaunchFactory {
    IPonsV2FeeEscrow private immutable _feeEscrow;
    mapping(address => LaunchedToken) private _launched;

    constructor(IPonsV2FeeEscrow feeEscrow_) {
        _feeEscrow = feeEscrow_;
    }

    function setLaunchedToken(address token, LaunchedToken calldata launch) external {
        _launched[token] = launch;
    }

    function launchToken(PonsV2TokenParams calldata, uint256, address)
        external
        payable
        override
        returns (address, address)
    {
        revert("MockPonsV2Factory: launchToken not supported, use setLaunchedToken");
    }

    function getLaunchedToken(address token) external view override returns (LaunchedToken memory) {
        return _launched[token];
    }

    function getLaunchConfig(uint256) external pure override returns (LaunchConfig memory) {
        revert("MockPonsV2Factory: not supported");
    }

    function launchConfigCount() external pure override returns (uint256) {
        return 0;
    }

    function previewLaunchEconomics(uint256, address) external pure override returns (bytes32) {
        return bytes32(0);
    }

    function launchEnabled() external pure override returns (bool) {
        return true;
    }

    function launchFee() external pure override returns (uint256) {
        return 0;
    }

    function maxCreatorTaxBps() external pure override returns (uint256) {
        return 0;
    }

    function canLaunch(address) external pure override returns (bool) {
        return true;
    }

    function feeEscrow() external view override returns (IPonsV2FeeEscrow) {
        return _feeEscrow;
    }

    function memeHook() external pure override returns (address) {
        return address(0);
    }

    function launchDeployer() external pure override returns (address) {
        return address(0);
    }

    function owner() external pure override returns (address) {
        return address(0);
    }

    function transferCreatorFeeRecipient(address, address) external pure override {
        revert("MockPonsV2Factory: not supported");
    }
}
