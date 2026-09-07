// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockUSDG
/// @notice TESTNET ONLY. A worthless, mintable-by-faucet ERC-20 that stands in for USDG so the
///         YieldJack MVP can be demonstrated end-to-end on Robinhood Chain Testnet without any
///         real value at risk. This is NOT the canonical USDG token and has no relationship to
///         it beyond sharing a decimals convention for realistic UI formatting.
/// @dev Decimals fixed at 6, matching the documented canonical mainnet USDG token so that
///      frontend formatting logic is representative of production. See docs/ARCHITECTURE.md.
contract MockUSDG is ERC20, Ownable {
    /// @notice Emitted whenever a wallet claims from the faucet.
    event FaucetClaimed(address indexed account, uint256 amount, uint256 nextClaimAvailableAt);

    /// @notice Emitted when the owner grants or revokes minter status.
    event MinterUpdated(address indexed account, bool allowed);

    /// @notice Thrown when a wallet claims before its cooldown has elapsed.
    error FaucetCooldownActive(uint256 availableAt);

    /// @notice Thrown when a non-minter calls a minter-gated function.
    error NotMinter(address account);

    uint8 private constant DECIMALS = 6;

    /// @notice Amount minted per faucet claim (1,000 mock USDG).
    uint256 public constant FAUCET_AMOUNT = 1_000 * 10 ** DECIMALS;

    /// @notice Minimum time a wallet must wait between faucet claims.
    uint256 public constant FAUCET_COOLDOWN = 12 hours;

    /// @notice Last faucet claim timestamp per account.
    mapping(address => uint256) public lastFaucetClaim;

    /// @notice Addresses allowed to mint beyond the faucet (owner + MockYieldSource, for
    ///         simulated-yield minting). TESTNET ONLY — a production USDG token has no such role.
    mapping(address => bool) public minters;

    modifier onlyMinter() {
        if (!minters[msg.sender]) revert NotMinter(msg.sender);
        _;
    }

    constructor(address initialOwner) ERC20("Mock USDG (YieldJack Testnet)", "mUSDG") Ownable(initialOwner) {
        minters[initialOwner] = true;
        emit MinterUpdated(initialOwner, true);
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /// @notice Mints `FAUCET_AMOUNT` of worthless test tokens to the caller, subject to a
    ///         per-wallet cooldown. TESTNET ONLY — a production USDG token has no such function.
    function faucet() external {
        uint256 last = lastFaucetClaim[msg.sender];
        // `last == 0` means "never claimed" — skip the cooldown check entirely so a wallet's
        // first-ever claim can never be rejected, regardless of how low `block.timestamp`
        // happens to be on a given chain (some private/test chains start near genesis 0).
        if (last != 0) {
            uint256 availableAt = last + FAUCET_COOLDOWN;
            if (block.timestamp < availableAt) revert FaucetCooldownActive(availableAt);
        }

        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);

        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT, block.timestamp + FAUCET_COOLDOWN);
    }

    /// @notice Grants or revokes minter status. Used to authorize `MockYieldSource` to mint
    ///         simulated yield, and to authorize deploy/seed scripts. TESTNET ONLY.
    function setMinter(address account, bool allowed) external onlyOwner {
        minters[account] = allowed;
        emit MinterUpdated(account, allowed);
    }

    /// @notice Mints test tokens. Restricted to approved minters (owner + MockYieldSource).
    ///         TESTNET ONLY — never present on a real stablecoin.
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }
}
