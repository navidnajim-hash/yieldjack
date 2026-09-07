// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IPonsV2FeeEscrow } from "./IPonsV2FeeEscrow.sol";

/// @notice Graduation lifecycle phase for one launch. Copied verbatim from pons V2 source — see
///         IPonsV2FeeEscrow.sol for the pinned commit and attribution.
enum GraduationPhase {
    NotGraduated,
    Swept,
    PoolCreated,
    Rescued
}

/// @notice Immutable per-launch pool/curve economics selected by `launchConfigId` at launch time.
///         Copied verbatim (field order and types) from pons V2 source's
///         `PonsV2LaunchFactory.LaunchConfig`.
struct LaunchConfig {
    uint256 supply;
    uint256 curveFeeBps;
    uint256 phantomQuote;
    uint256 graduationThreshold;
    uint24 poolFee;
    int24 tickSpacing;
    bool enabled;
}

/// @notice Record kept by PonsV2LaunchFactory for every launch. Copied verbatim (field order and
///         types) from pons V2 source's `IPonsV2LaunchFactory.LaunchedToken`.
struct LaunchedToken {
    address token;
    address curve;
    address deployer;
    address creatorFeeRecipient;
    address pairToken;
    uint256 graduationThreshold;
    uint24 poolFee;
    int24 tickSpacing;
    uint16 creatorTaxBps;
    bool buybackEnabled;
    GraduationPhase phase;
    uint256 sweptQuote;
    uint256 sweptTokens;
    uint256 sweptAt;
    bool exists;
}

/// @notice Optional social metadata attached to a launch token. Copied verbatim (field order and
///         types) from pons V2 source's `PonsV2LauncherToken.Socials`.
struct PonsV2Socials {
    string twitter;
    string telegram;
    string discord;
    string website;
    string farcaster;
}

/// @notice Per-launch parameters passed to `launchToken`. Copied verbatim (field order and
///         types) from pons V2 source's `PonsV2LaunchFactory.TokenParams` — this must match
///         exactly for ABI encoding to line up with the deployed factory.
struct PonsV2TokenParams {
    string name;
    string symbol;
    string logo;
    string description;
    PonsV2Socials socials;
    address creatorFeeRecipient;
    uint16 creatorTaxBps;
    bool buybackEnabled;
    bytes32 expectedEconomics;
    bytes32 salt;
}

/// @title IPonsV2LaunchFactory
/// @notice Minimal interface for pons V2's launch factory. Function signatures and struct
///         layouts copied (no implementation vendored) from the official pons V2 source at
///         github.com/ponsdotdev/ponsfamily, commit 8b9bf371030279133017b5c1b713823f5889c5d2,
///         MIT licensed (`contractsV2/src/v2/PonsV2LaunchFactory.sol` and
///         `contractsV2/src/v2/interfaces/ILaunchpadV2.sol`). Restricted to the subset of the
///         real `PonsV2LaunchFactory` surface this repository actually calls: JackFeeRouter's
///         one-time launch-configuration check, the read-only reporting script, and the
///         fork-only lifecycle simulation / integration test. Does not vendor the launch
///         factory's implementation, its bonding curve, its Uniswap V4 hook, or any of their
///         dependencies. See THIRD_PARTY_NOTICES.md.
interface IPonsV2LaunchFactory {
    function launchToken(PonsV2TokenParams calldata params, uint256 launchConfigId, address pairToken)
        external
        payable
        returns (address token, address curve);

    function getLaunchedToken(address token) external view returns (LaunchedToken memory);
    function getLaunchConfig(uint256 id) external view returns (LaunchConfig memory);
    function launchConfigCount() external view returns (uint256);
    function previewLaunchEconomics(uint256 launchConfigId, address pairToken) external view returns (bytes32);

    function launchEnabled() external view returns (bool);
    function launchFee() external view returns (uint256);
    function maxCreatorTaxBps() external view returns (uint256);
    function canLaunch(address launcher) external view returns (bool);

    function feeEscrow() external view returns (IPonsV2FeeEscrow);
    function memeHook() external view returns (address);
    function launchDeployer() external view returns (address);
    function owner() external view returns (address);

    function transferCreatorFeeRecipient(address token, address newRecipient) external;
}
