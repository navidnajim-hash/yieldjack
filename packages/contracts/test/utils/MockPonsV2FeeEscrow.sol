// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IPonsV2FeeEscrow } from "../../src/interfaces/IPonsV2FeeEscrow.sol";

/// @notice Minimal stand-in for pons V2's `IPonsV2FeeEscrow`, used only to unit-test
///         JackFeeRouter.harvest() without a live fork (see JackRobinhoodMainnetFork.t.sol for
///         the real-escrow version). Supports crediting native ETH and claiming it back, plus a
///         test-only `shortfall` knob that makes `claim` pay out less than the amount it debits,
///         so tests can prove JackFeeRouter measures the actual ETH received rather than
///         trusting the requested/claimed amount. Never referenced outside the test suite.
contract MockPonsV2FeeEscrow is IPonsV2FeeEscrow {
    mapping(address => uint256) private _balances;

    /// @notice When nonzero, `claim` sends `amount - shortfall` (floored at zero) instead of
    ///         `amount`, while still debiting the recipient's recorded balance by the full
    ///         `amount`.
    uint256 public shortfall;

    function setShortfall(uint256 amount) external {
        shortfall = amount;
    }

    function credit(address recipient) external payable override {
        _balances[recipient] += msg.value;
    }

    function creditToken(address, address, uint256) external pure override {
        revert("MockPonsV2FeeEscrow: token credit not supported");
    }

    function claim() external override returns (uint256 amount) {
        amount = _balances[msg.sender];
        _claim(msg.sender, amount);
    }

    function claim(uint256 amount) external override returns (uint256) {
        _claim(msg.sender, amount);
        return amount;
    }

    function claimToken(address) external pure override returns (uint256) {
        revert("MockPonsV2FeeEscrow: token claim not supported");
    }

    function claimToken(address, uint256) external pure override returns (uint256) {
        revert("MockPonsV2FeeEscrow: token claim not supported");
    }

    function balanceOf(address recipient) external view override returns (uint256) {
        return _balances[recipient];
    }

    function balanceOfToken(address, address) external pure override returns (uint256) {
        return 0;
    }

    function _claim(address recipient, uint256 amount) private {
        require(_balances[recipient] >= amount, "MockPonsV2FeeEscrow: insufficient balance");
        _balances[recipient] -= amount;
        uint256 toSend = amount > shortfall ? amount - shortfall : 0;
        (bool ok,) = recipient.call{ value: toSend }("");
        require(ok, "MockPonsV2FeeEscrow: ETH send failed");
    }
}
