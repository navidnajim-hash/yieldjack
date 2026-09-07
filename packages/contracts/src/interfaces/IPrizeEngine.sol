// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IPrizeEngine
/// @notice Abstraction over the draw/prize lifecycle so the vault and sponsor registry can
///         depend on a stable interface instead of a concrete implementation.
interface IPrizeEngine {
    enum RoundState {
        OPEN,
        RANDOMNESS_REQUESTED,
        AWARDED,
        CLAIMED,
        EXPIRED
    }

    /// @notice The round currently accepting eligibility accrual.
    function currentRoundId() external view returns (uint256);

    /// @notice The state of a given round.
    function roundState(uint256 roundId) external view returns (RoundState);

    /// @notice Adds sponsor-funded prize assets (already transferred to the engine) to `roundId`.
    /// @param jackBurned The amount of MockJACK the sponsor burned to create this sponsorship,
    ///        recorded for transparency only — it has no effect on prize odds.
    /// @dev Only callable by the configured SponsorRegistry. Must not alter any user's weight.
    function addSponsorFunds(
        uint256 roundId,
        uint256 amount,
        address sponsor,
        uint256 jackBurned,
        string calldata metadata
    ) external;
}
