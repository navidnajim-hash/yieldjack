// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IPrizeEngine } from "../interfaces/IPrizeEngine.sol";

/// @title SponsorRegistry
/// @notice Lets anyone fund a bonus prize for the currently open round in MockUSDG, burning a
///         configurable amount of MockJACK in the process — the MVP's demonstration of $JACK
///         utility. TESTNET ONLY: MockJACK is not the real $JACK token (see MockJACK.sol); the
///         real token's address will be wired up separately post-launch.
/// @dev Sponsorship only ever touches a round's `prizeAmount` via `IPrizeEngine.addSponsorFunds`
///      — it never touches `YieldJackVault` principal or any user's eligibility weight, so
///      sponsoring can never buy better base odds for the sponsor or for JACK holders generally.
contract SponsorRegistry is Ownable {
    using SafeERC20 for IERC20;

    /// @notice Cap on sponsor metadata length, to bound storage/gas costs.
    uint256 public constant MAX_METADATA_LENGTH = 128;

    IPrizeEngine public immutable prizeEngine;
    IERC20 public immutable usdg;
    IERC20 public immutable jack;

    /// @notice Address MockJACK is sent to when sponsoring. Conventionally unspendable.
    address public immutable burnAddress;

    /// @notice Minimum MockJACK a sponsor must burn per sponsorship. Owner-adjustable; does not
    ///         affect prize odds, only the cost of sponsoring.
    uint256 public minJackBurn;

    event Sponsored(
        address indexed sponsor, uint256 indexed roundId, uint256 usdgAmount, uint256 jackBurned, string metadata
    );
    event MinJackBurnUpdated(uint256 newMinimum);

    error ZeroAmount();
    error ZeroAddress();
    error JackBurnTooLow(uint256 provided, uint256 minimum);
    error MetadataTooLong(uint256 length, uint256 maxLength);

    constructor(
        IPrizeEngine prizeEngine_,
        IERC20 usdg_,
        IERC20 jack_,
        address burnAddress_,
        uint256 minJackBurn_,
        address initialOwner
    ) Ownable(initialOwner) {
        if (
            address(prizeEngine_) == address(0) || address(usdg_) == address(0) || address(jack_) == address(0)
                || burnAddress_ == address(0)
        ) {
            revert ZeroAddress();
        }
        prizeEngine = prizeEngine_;
        usdg = usdg_;
        jack = jack_;
        burnAddress = burnAddress_;
        minJackBurn = minJackBurn_;
    }

    function setMinJackBurn(uint256 newMinimum) external onlyOwner {
        minJackBurn = newMinimum;
        emit MinJackBurnUpdated(newMinimum);
    }

    /// @notice The round a sponsorship submitted right now would land in.
    function currentTargetRound() external view returns (uint256) {
        return prizeEngine.currentRoundId();
    }

    /// @notice Sponsors the currently open round with `usdgAmount` of bonus prize, burning
    ///         `jackBurnAmount` of MockJACK. Requires prior ERC-20 approval of both tokens.
    function sponsor(uint256 usdgAmount, uint256 jackBurnAmount, string calldata metadata) external {
        if (usdgAmount == 0) revert ZeroAmount();
        if (jackBurnAmount < minJackBurn) revert JackBurnTooLow(jackBurnAmount, minJackBurn);
        if (bytes(metadata).length > MAX_METADATA_LENGTH) {
            revert MetadataTooLong(bytes(metadata).length, MAX_METADATA_LENGTH);
        }

        uint256 roundId = prizeEngine.currentRoundId();

        usdg.safeTransferFrom(msg.sender, address(prizeEngine), usdgAmount);
        if (jackBurnAmount > 0) {
            jack.safeTransferFrom(msg.sender, burnAddress, jackBurnAmount);
        }

        prizeEngine.addSponsorFunds(roundId, usdgAmount, msg.sender, jackBurnAmount, metadata);

        emit Sponsored(msg.sender, roundId, usdgAmount, jackBurnAmount, metadata);
    }
}
