// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IRandomnessProvider
/// @notice Abstraction over a source of randomness used to select prize winners.
/// @dev `DemoRandomnessProvider` implements this with block-derived entropy and is NOT
///      secure for mainnet use. A production deployment must replace it with a verifiable
///      randomness provider (e.g. a VRF) behind this same interface. See
///      docs/PRODUCTION_ROADMAP.md.
interface IRandomnessProvider {
    /// @notice Requests randomness for a given round. Only callable by the configured prize engine.
    /// @return requestId An identifier used to later fetch the fulfilled value.
    function requestRandomness(uint256 roundId) external returns (uint256 requestId);

    /// @notice Returns whether `requestId` has been fulfilled and a value is available.
    function isFulfilled(uint256 requestId) external view returns (bool);

    /// @notice Returns the fulfilled random value for `requestId`.
    /// @dev Reverts if the request has not been fulfilled yet.
    function getRandomness(uint256 requestId) external view returns (uint256);
}
