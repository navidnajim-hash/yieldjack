// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IYieldSource } from "../interfaces/IYieldSource.sol";

/// @notice Minimal interface for a mintable test token, used only by `simulateYield`. Kept
///         separate from any concrete token so this yield source stays decoupled from
///         `MockUSDG`'s implementation.
interface IMintableAsset {
    function mint(address to, uint256 amount) external;
}

/// @title MockYieldSource
/// @notice TESTNET ONLY. An ERC-4626 vault over MockUSDG that stands in for a real yield
///         venue (e.g. a verified USDG money-market vault). `YieldJackVault` deposits its
///         users' principal here and yield is realized by minting additional MockUSDG
///         directly into this contract's balance via `simulateYield`, which raises the
///         redeemable value of every existing share exactly the way real yield would.
/// @dev This contract intentionally does NOT connect to any real Morpho, Steakhouse, or other
///      third-party vault. Swapping in a production yield source means deploying a new
///      contract that implements `IYieldSource` (ideally also ERC-4626) and pointing
///      `YieldJackVault` at it — no change to vault logic is required.
contract MockYieldSource is ERC4626, IYieldSource {
    /// @notice Emitted when simulated yield is minted into the vault.
    event YieldSimulated(address indexed caller, uint256 amount, uint256 newTotalAssets);

    /// @notice Thrown when a simulated-yield request exceeds the per-call cap.
    error SimulatedYieldTooLarge(uint256 amount, uint256 maxAmount);

    /// @notice Thrown by `simulateYield` when no shares are outstanding yet.
    error NoSharesOutstanding();

    /// @notice Hard cap on how much simulated yield a single call may inject, to keep demo
    ///         numbers sane. TESTNET ONLY — a real yield source has no such concept.
    uint256 public constant MAX_SIMULATED_YIELD_PER_CALL = 10_000 * 10 ** 6;

    constructor(IERC20 asset_) ERC20("YieldJack Mock Yield Shares", "yjMOCK") ERC4626(asset_) { }

    /// @notice Mints `amount` of the underlying asset directly into this vault, increasing the
    ///         assets redeemable per share for every existing depositor — a real, onchain yield
    ///         event, not a display-only number. Callable by anyone; the benefit accrues to the
    ///         whole pool (via YieldJackVault), not to the caller. TESTNET ONLY. Requires the
    ///         configured asset to implement `IMintableAsset` (true of `MockUSDG`).
    /// @dev Reverts if `totalSupply() == 0`. This closes a classic ERC-4626 share-inflation
    ///      attack: donating assets into an empty vault (no shares outstanding) skews the
    ///      share price so the *next* depositor gets rounded down to ~0 shares while
    ///      `YieldJackVault` would still credit them full principal — see
    ///      docs/THREAT_MODEL.md ("share inflation / first depositor"). `_decimalsOffset`
    ///      below adds a second layer of defense against the same class of attack.
    ///
    ///      The effective cap is also relative to the current pool (`totalAssets()`), not just
    ///      the flat `MAX_SIMULATED_YIELD_PER_CALL` ceiling: real yield is proportional to TVL
    ///      and could never 10,000x a pool in one block, and allowing that here would let a
    ///      single call skew the asset-per-share ratio so far that ordinary ERC-4626
    ///      floor-rounding (individually negligible) compounds into a visible amount. Capping
    ///      the ratio keeps that compounding bounded regardless of pool size.
    function simulateYield(uint256 amount) external {
        if (totalSupply() == 0) revert NoSharesOutstanding();
        uint256 cap = totalAssets();
        if (cap > MAX_SIMULATED_YIELD_PER_CALL) cap = MAX_SIMULATED_YIELD_PER_CALL;
        if (amount > cap) {
            revert SimulatedYieldTooLarge(amount, cap);
        }
        IMintableAsset(asset()).mint(address(this), amount);
        emit YieldSimulated(msg.sender, amount, totalAssets());
    }

    /// @dev OpenZeppelin's standard defense-in-depth against ERC-4626 inflation/donation
    ///      attacks: a nonzero virtual-share offset makes manipulating the share price via a
    ///      direct asset donation exponentially more expensive for an attacker. Combined with
    ///      the `totalSupply() == 0` guard on `simulateYield` above.
    function _decimalsOffset() internal pure override returns (uint8) {
        return 6;
    }

    /// @inheritdoc IYieldSource
    function totalAssetsOf(address account) external view returns (uint256) {
        return convertToAssets(balanceOf(account));
    }

    // The functions below are fully implemented by OpenZeppelin's ERC4626 base; these are thin
    // pass-through overrides required because both ERC4626 and IYieldSource declare them.

    function asset() public view override(ERC4626, IYieldSource) returns (address) {
        return super.asset();
    }

    function totalAssets() public view override(ERC4626, IYieldSource) returns (uint256) {
        return super.totalAssets();
    }

    function deposit(uint256 assets, address receiver) public override(ERC4626, IYieldSource) returns (uint256 shares) {
        return super.deposit(assets, receiver);
    }

    function withdraw(uint256 assets, address receiver, address owner)
        public
        override(ERC4626, IYieldSource)
        returns (uint256 shares)
    {
        return super.withdraw(assets, receiver, owner);
    }
}
