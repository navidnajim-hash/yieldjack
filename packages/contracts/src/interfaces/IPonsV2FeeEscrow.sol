// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IPonsV2FeeEscrow
/// @notice Minimal interface for pons V2's shared claimable-balance fee escrow. Function
///         signatures copied verbatim (no implementation vendored) from the official pons V2
///         source at github.com/ponsdotdev/ponsfamily, commit
///         8b9bf371030279133017b5c1b713823f5889c5d2,
///         contractsV2/src/v2/interfaces/ILaunchpadV2.sol (MIT licensed). See
///         THIRD_PARTY_NOTICES.md and docs/JACK_ARCHITECTURE.md for how this integration was
///         verified against both that source and live Robinhood Chain mainnet state.
/// @dev JackFeeRouter is registered as a launched JACK token's `creatorFeeRecipient`. Pons v2
///      credits that address's native-ETH creator-fee share here — confirmed directly from
///      source: both `PonsV2BondingCurve._creditQuote` (pre-graduation trades) and
///      `PonsV2MemeHook` (post-graduation trades) call `feeEscrow.credit{value: amount}(recipient)`
///      for a native-quote launch. JackFeeRouter then calls `claim(uint256)` on its own behalf to
///      pull exactly the ETH it read via `balanceOf`. This repository does not vendor the
///      escrow's implementation, only this interface — verified against the live deployed
///      contract's behavior in the Robinhood mainnet-fork test and in
///      script/PrintPonsV2State.s.sol.
interface IPonsV2FeeEscrow {
    function credit(address recipient) external payable;
    function creditToken(address recipient, address token, uint256 amount) external;
    function claim() external returns (uint256 amount);
    function claim(uint256 amount) external returns (uint256);
    function claimToken(address token) external returns (uint256 amount);
    function claimToken(address token, uint256 amount) external returns (uint256);
    function balanceOf(address recipient) external view returns (uint256);
    function balanceOfToken(address recipient, address token) external view returns (uint256);
}
