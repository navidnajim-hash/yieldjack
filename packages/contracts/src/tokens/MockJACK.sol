// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockJACK
/// @notice TESTNET ONLY. Stands in for the future real $JACK token so SponsorRegistry can
///         demonstrate JACK-burn-to-sponsor utility. This contract has no relationship to the
///         eventual production $JACK token, which will be deployed and configured separately
///         — see `SponsorRegistry.setJackToken`. Never hardcode a "real" $JACK address anywhere
///         in this codebase; it does not exist yet.
contract MockJACK is ERC20, Ownable {
    event FaucetClaimed(address indexed account, uint256 amount, uint256 nextClaimAvailableAt);

    error FaucetCooldownActive(uint256 availableAt);

    /// @notice Amount minted per faucet claim (500 mock JACK, 18 decimals).
    uint256 public constant FAUCET_AMOUNT = 500 ether;

    /// @notice Minimum time a wallet must wait between faucet claims.
    uint256 public constant FAUCET_COOLDOWN = 12 hours;

    mapping(address => uint256) public lastFaucetClaim;

    constructor(address initialOwner) ERC20("Mock JACK (YieldJack Testnet)", "mJACK") Ownable(initialOwner) { }

    /// @notice Mints `FAUCET_AMOUNT` of worthless test tokens to the caller, subject to a
    ///         per-wallet cooldown. TESTNET ONLY.
    function faucet() external {
        uint256 last = lastFaucetClaim[msg.sender];
        // See MockUSDG.faucet for why `last == 0` ("never claimed") skips the cooldown check.
        if (last != 0) {
            uint256 availableAt = last + FAUCET_COOLDOWN;
            if (block.timestamp < availableAt) revert FaucetCooldownActive(availableAt);
        }

        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);

        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT, block.timestamp + FAUCET_COOLDOWN);
    }

    /// @notice Seeds an address with test tokens without waiting for the cooldown.
    /// @dev Restricted to the deployer/owner and used only by local demo seed scripts.
    function ownerMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
