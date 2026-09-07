// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title IYieldSource
/// @notice Minimal interface a yield-bearing venue must satisfy to back a YieldJackVault.
/// @dev Modeled loosely after ERC-4626 so a production implementation (e.g. a verified
///      USDG money-market vault) can be swapped in for `MockYieldSource` without changing
///      `YieldJackVault`. This is intentionally a small subset of ERC-4626, not the full
///      standard, so that both the mock and any future adapter stay simple to audit.
interface IYieldSource {
    /// @notice The ERC-20 asset this yield source accepts and denominates in.
    function asset() external view returns (address);

    /// @notice Deposits `assets` of the underlying token from the caller into the yield source.
    /// @dev The caller must have approved this contract to pull `assets` beforehand.
    /// @return shares The amount of internal accounting units credited to `receiver`.
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);

    /// @notice Withdraws `assets` of the underlying token, sending it to `receiver`.
    /// @param owner The account whose accounting balance is debited.
    /// @return shares The amount of internal accounting units debited from `owner`.
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);

    /// @notice The total underlying-asset value currently owned by `account` in this yield source.
    function totalAssetsOf(address account) external view returns (uint256);

    /// @notice The total underlying-asset value held by the yield source across all depositors.
    function totalAssets() external view returns (uint256);
}
