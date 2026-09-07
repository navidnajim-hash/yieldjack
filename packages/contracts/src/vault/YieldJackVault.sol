// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IYieldSource } from "../interfaces/IYieldSource.sol";

/// @title YieldJackVault
/// @notice Custody and accounting contract for YieldJack. Users deposit MockUSDG, the vault
///         routes it into an `IYieldSource`, and it tracks each user's principal claim plus a
///         time-weighted eligibility measure consumed by `DemoPrizeEngine` at draw close.
///
/// @dev Design decisions (documented per project convention, see docs/ARCHITECTURE.md):
///      - No receipt/share token is minted to depositors. Principal is tracked internally via
///        `principal[user]`. This is simpler to reason about for the MVP, avoids a secondary
///        market in eligibility receipts, and removes an entire class of transfer-based
///        eligibility-gaming bugs. See docs/ACCOUNTING_INVARIANTS.md.
///      - Eligibility weight is a simplified, per-round accumulator ("weight-seconds" = balance
///        integrated over time), NOT a full historical TWAB ring buffer like PoolTogether's
///        TwabController. This MVP only ever needs "weight since the current round opened",
///        so the simpler model is sufficient, easier to audit, and deliberately original code
///        (see THIRD_PARTY_NOTICES.md).
///      - The active-participant set is capped at `MAX_PARTICIPANTS` so that the bounded loop
///        in `snapshotAndReset`/`previewAllWeights` can never exceed a known gas ceiling. This
///        is an explicit TESTNET-ONLY limitation — see docs/PRODUCTION_ROADMAP.md.
///      - `yieldSource` is immutable. `prizeEngine` is set exactly once, by the owner, during
///        deployment wiring (see script/DeployLocal.s.sol) — after that it is permanently
///        locked and is never an ongoing admin capability.
///      - Administrative pause blocks new deposits only. Withdrawals always remain available,
///        even while paused, so a pause can never be used to trap depositor funds.
contract YieldJackVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Hard cap on concurrently-active depositors. TESTNET ONLY — see
    ///         docs/PRODUCTION_ROADMAP.md for the production plan to remove this limit.
    uint256 public constant MAX_PARTICIPANTS = 256;

    /// @notice The MockUSDG-denominated yield venue backing all deposits.
    IYieldSource public immutable yieldSource;

    /// @notice The underlying deposit asset (MockUSDG).
    IERC20 public immutable asset;

    /// @notice The DemoPrizeEngine authorized to pull yield and snapshot eligibility. Settable
    ///         exactly once by the owner as part of initial deployment wiring; permanently
    ///         locked thereafter. See the design notes at the top of this file.
    address public prizeEngine;

    /// @notice Maximum combined principal the vault will accept. TESTNET safety cap.
    uint256 public depositCap;

    /// @notice Sum of every depositor's current principal balance.
    uint256 public totalPrincipal;

    /// @notice Each user's current principal claim.
    mapping(address => uint256) public principal;

    /// @notice Weight accumulated for `user` since `lastUpdate[user]`, not yet snapshotted.
    mapping(address => uint256) private pendingWeight;

    /// @notice Timestamp `user`'s balance was last checkpointed.
    mapping(address => uint256) private lastUpdate;

    /// @notice Start of the current accrual window (reset each time a round opens).
    uint256 public accrualWindowStart;

    address[] private activeParticipantList;
    mapping(address => uint256) private participantIndexPlusOne; // 0 == not present

    event Deposited(address indexed user, uint256 assets, uint256 newPrincipal);
    event Withdrawn(address indexed user, uint256 assets, uint256 newPrincipal);
    event PrizeEngineSet(address indexed engine);
    event DepositCapUpdated(uint256 newCap);
    event YieldPulled(address indexed to, uint256 requested, uint256 actual);
    event EligibilitySnapshot(uint256 indexed asOf, uint256 participantCount, uint256 totalWeight);

    error ZeroAmount();
    error ZeroAddress();
    error DepositCapExceeded(uint256 attempted, uint256 cap);
    error InsufficientPrincipal(uint256 available, uint256 requested);
    error NotPrizeEngine(address caller);
    error PrizeEngineAlreadySet();
    error ParticipantCapReached(uint256 cap);

    modifier onlyPrizeEngine() {
        if (msg.sender != prizeEngine) revert NotPrizeEngine(msg.sender);
        _;
    }

    constructor(IYieldSource yieldSource_, uint256 initialDepositCap, address initialOwner) Ownable(initialOwner) {
        if (address(yieldSource_) == address(0)) revert ZeroAddress();
        yieldSource = yieldSource_;
        asset = IERC20(yieldSource_.asset());
        depositCap = initialDepositCap;
        accrualWindowStart = block.timestamp;
    }

    // ---------------------------------------------------------------------
    // Admin wiring / controls
    // ---------------------------------------------------------------------

    /// @notice One-time wiring of the prize engine address. Only ever callable once, by the
    ///         owner, as part of deployment. Not an ongoing admin capability — see contract
    ///         design notes at the top of this file.
    function setPrizeEngine(address engine) external onlyOwner {
        if (prizeEngine != address(0)) revert PrizeEngineAlreadySet();
        if (engine == address(0)) revert ZeroAddress();
        prizeEngine = engine;
        emit PrizeEngineSet(engine);
    }

    /// @notice Updates the testnet TVL cap. Does not affect existing deposits.
    function setDepositCap(uint256 newCap) external onlyOwner {
        depositCap = newCap;
        emit DepositCapUpdated(newCap);
    }

    /// @notice Pauses new deposits and (via `DemoPrizeEngine`) new draw creation. Withdrawals
    ///         are never affected — see `withdraw`, which has no `whenNotPaused` modifier.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Deposits / withdrawals
    // ---------------------------------------------------------------------

    /// @notice Deposits `assets` of MockUSDG, crediting the caller's principal and routing the
    ///         funds into the yield source. Reverts if paused or if `depositCap` would be
    ///         exceeded.
    function deposit(uint256 assets) external nonReentrant whenNotPaused {
        if (assets == 0) revert ZeroAmount();
        uint256 newTotal = totalPrincipal + assets;
        if (newTotal > depositCap) revert DepositCapExceeded(newTotal, depositCap);

        _accrue(msg.sender);
        _addParticipantIfNew(msg.sender);

        principal[msg.sender] += assets;
        totalPrincipal = newTotal;

        asset.safeTransferFrom(msg.sender, address(this), assets);
        asset.forceApprove(address(yieldSource), assets);
        yieldSource.deposit(assets, address(this));

        emit Deposited(msg.sender, assets, principal[msg.sender]);
    }

    /// @notice Withdraws `assets` of principal back to the caller. Always available, including
    ///         while the vault is paused.
    /// @dev The actual amount transferred is capped at the yield source's floor-rounded claim
    ///      for this vault (`totalAssetsOf(address(this))`, equivalent to ERC-4626's
    ///      `maxWithdraw`). In extreme yield-to-principal ratios, compounding floor-rounding
    ///      can leave that claim a wei or two below the nominal request; capping (instead of
    ///      reverting) means a legitimate withdrawal of one's full principal can never be
    ///      trapped by rounding dust — see docs/ACCOUNTING_INVARIANTS.md.
    function withdraw(uint256 assets) external nonReentrant {
        if (assets == 0) revert ZeroAmount();
        uint256 bal = principal[msg.sender];
        if (assets > bal) revert InsufficientPrincipal(bal, assets);

        _accrue(msg.sender);

        uint256 newBal = bal - assets;
        principal[msg.sender] = newBal;
        totalPrincipal -= assets;
        if (newBal == 0) _removeParticipant(msg.sender);

        uint256 vaultClaim = yieldSource.totalAssetsOf(address(this));
        uint256 toWithdraw = assets > vaultClaim ? vaultClaim : assets;
        if (toWithdraw > 0) {
            yieldSource.withdraw(toWithdraw, msg.sender, address(this));
        }

        emit Withdrawn(msg.sender, toWithdraw, newBal);
    }

    // ---------------------------------------------------------------------
    // Prize engine hooks
    // ---------------------------------------------------------------------

    /// @notice Sends up to `amount` of realized yield to `to` (the prize engine's escrow).
    ///         Never sends more than `availableYield()`, so principal can never be pulled even
    ///         if the caller's accounting is off — an intentional extra safety margin.
    /// @return actual The amount actually transferred.
    function pullYield(uint256 amount, address to) external onlyPrizeEngine nonReentrant returns (uint256 actual) {
        uint256 avail = availableYield();
        actual = amount > avail ? avail : amount;
        if (actual == 0) return 0;
        yieldSource.withdraw(actual, to, address(this));
        emit YieldPulled(to, amount, actual);
    }

    /// @notice Finalizes eligibility weight for every active participant as of `asOf`
    ///         (the closing round's end time), then opens a fresh accrual window starting
    ///         `newWindowStart` (carrying forward any time already elapsed past `asOf`).
    ///         Bounded to at most `MAX_PARTICIPANTS` iterations.
    /// @dev Only the prize engine may call this, and only at round close.
    function snapshotAndReset(uint256 asOf, uint256 newWindowStart)
        external
        onlyPrizeEngine
        returns (address[] memory participants, uint256[] memory weights, uint256 totalWeight)
    {
        uint256 n = activeParticipantList.length;
        participants = new address[](n);
        weights = new uint256[](n);

        for (uint256 i = 0; i < n; ++i) {
            address user = activeParticipantList[i];
            uint256 weight = _weightAsOf(user, asOf);

            participants[i] = user;
            weights[i] = weight;
            totalWeight += weight;

            // Carry forward any time between `asOf` and now into the new window.
            pendingWeight[user] = block.timestamp > asOf ? principal[user] * (block.timestamp - asOf) : 0;
            lastUpdate[user] = block.timestamp;
        }

        accrualWindowStart = newWindowStart;
        emit EligibilitySnapshot(asOf, n, totalWeight);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice Realized yield available to fund prizes: the yield source's total value credited
    ///         to this vault, minus all outstanding principal. Never includes principal.
    function availableYield() public view returns (uint256) {
        uint256 vaultAssets = yieldSource.totalAssetsOf(address(this));
        if (vaultAssets <= totalPrincipal) return 0;
        return vaultAssets - totalPrincipal;
    }

    function activeParticipantCount() external view returns (uint256) {
        return activeParticipantList.length;
    }

    function activeParticipantAt(uint256 index) external view returns (address) {
        return activeParticipantList[index];
    }

    /// @notice Live, non-mutating preview of every active participant's weight as of `asOf`
    ///         (typically `block.timestamp`), for frontend "estimated chance" displays.
    function previewAllWeights(uint256 asOf)
        external
        view
        returns (address[] memory participants, uint256[] memory weights, uint256 totalWeight)
    {
        uint256 n = activeParticipantList.length;
        participants = new address[](n);
        weights = new uint256[](n);
        for (uint256 i = 0; i < n; ++i) {
            address user = activeParticipantList[i];
            uint256 weight = _weightAsOf(user, asOf);
            participants[i] = user;
            weights[i] = weight;
            totalWeight += weight;
        }
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    function _weightAsOf(address user, uint256 asOf) private view returns (uint256 weight) {
        weight = pendingWeight[user];
        uint256 from = lastUpdate[user] < accrualWindowStart ? accrualWindowStart : lastUpdate[user];
        if (asOf > from) {
            weight += principal[user] * (asOf - from);
        }
    }

    function _accrue(address user) private {
        pendingWeight[user] = _weightAsOf(user, block.timestamp);
        lastUpdate[user] = block.timestamp;
    }

    function _addParticipantIfNew(address user) private {
        if (participantIndexPlusOne[user] != 0) return;
        if (activeParticipantList.length >= MAX_PARTICIPANTS) revert ParticipantCapReached(MAX_PARTICIPANTS);
        activeParticipantList.push(user);
        participantIndexPlusOne[user] = activeParticipantList.length;
    }

    function _removeParticipant(address user) private {
        uint256 indexPlusOne = participantIndexPlusOne[user];
        if (indexPlusOne == 0) return;
        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = activeParticipantList.length - 1;
        if (index != lastIndex) {
            address lastUser = activeParticipantList[lastIndex];
            activeParticipantList[index] = lastUser;
            participantIndexPlusOne[lastUser] = index + 1;
        }
        activeParticipantList.pop();
        delete participantIndexPlusOne[user];
    }
}
