// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IJackStakingRewards
/// @notice Narrow surface JackFeeRouter needs from a staking contract: enough to validate a
///         candidate's immutables (at initial configuration and at migration-proposal time) and
///         to push a new reward stream. Deliberately does not expose `stake`/`withdraw`/etc. —
///         the router never calls those.
interface IJackStakingRewards {
    function notifyRewardAmount(uint256 amount) external;
    function stakingToken() external view returns (address);
    function rewardToken() external view returns (address);
}
