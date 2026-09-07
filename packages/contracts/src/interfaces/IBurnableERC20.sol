// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IBurnableERC20
/// @notice Minimal interface for an ERC-20 that supports an allowance-respecting supply burn
///         (OpenZeppelin's `ERC20Burnable.burnFrom` shape). `SponsorRegistry` depends on this,
///         not on a concrete token, so that whatever token is wired in — `MockJACK` today, the
///         real `$JACK` token later — actually reduces total supply when "burned", rather than
///         merely being transferred to a conventionally-unspendable address. A real supply
///         burn is a genuine on-chain fact (`totalSupply()` decreases, verifiable by anyone);
///         a transfer to a "dead" address is not the same thing and must never be described as
///         one. See docs/ACCOUNTING_INVARIANTS.md and THIRD_PARTY_NOTICES.md.
interface IBurnableERC20 {
    /// @notice Burns `amount` from `account`'s balance, permanently reducing `totalSupply()`.
    ///         Requires the caller to hold an allowance from `account` of at least `amount`,
    ///         exactly like `transferFrom`.
    function burnFrom(address account, uint256 amount) external;
}
