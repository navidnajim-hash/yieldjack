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
///      - Round-boundary semantics: `DemoPrizeEngine`'s round `endTime` is the EARLIEST
///        permissionless close time, not a hard weight cutoff. `snapshotAndReset` always
///        snapshots as of `block.timestamp` — the instant `closeRound` actually executes — and
///        the new accrual window starts at that exact same instant. A deposit or withdrawal
///        made after the scheduled `endTime` but before anyone has actually closed the round is
///        still genuinely part of that still-open round, weighted correctly for however long it
///        was actually held. There is no longer a separate, earlier "asOf" for a later
///        checkpoint to outrun, which is what let weight leak across a round boundary before —
///        see docs/ACCOUNTING_INVARIANTS.md.
///      - A user who fully withdraws mid-round stays in the active-participant set — with their
///        already-accrued weight intact — until the *next* snapshot, so that weight is correctly
///        credited to the round they earned it in. They are removed only as part of that
///        snapshot's cleanup pass, once their weight has been recorded and their pending weight
///        reset to zero, so a later deposit (in any future round) can never pick up stale weight
///        from a round they already left. The trade-off — a repeatedly-withdrawn address holds
///        its `MAX_PARTICIPANTS` slot until the round closes rather than freeing it immediately —
///        is bounded by the round's own duration and is an accepted testnet-only limitation.
///      - `withdraw` pays out at most the yield source's real redeemable claim, which can be
///        less than the amount requested (rounding dust, or in a more severe case an actual
///        yield-source loss). Principal is reduced by exactly the amount paid, never by the
///        amount requested — an unpaid remainder always stays recorded as principal instead of
///        being silently erased.
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
    /// @param requested The amount the caller asked to withdraw.
    /// @param paid The amount actually transferred — may be less than `requested`; see `withdraw`.
    event Withdrawn(address indexed user, uint256 requested, uint256 paid, uint256 remainingPrincipal);
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

    /// @notice Withdraws up to `assets` of principal back to the caller. Always available,
    ///         including while the vault is paused.
    /// @dev The actual amount paid is capped at the yield source's real redeemable claim
    ///      (`totalAssetsOf(address(this))`, equivalent to ERC-4626's `maxWithdraw`) — this can
    ///      be less than `assets`, either from ordinary floor-rounding dust or, more seriously,
    ///      an actual loss of value in the yield source. Principal (and `totalPrincipal`) is
    ///      decreased by exactly `paid`, never by `assets` — an unpaid remainder always stays
    ///      recorded as principal rather than being silently erased, and can be withdrawn later
    ///      (e.g. once the yield source recovers value, or via a smaller request). A
    ///      zero-payment withdrawal is a valid, non-reverting no-op with respect to state: it
    ///      changes nothing and simply reports `paid == 0`. See
    ///      docs/ACCOUNTING_INVARIANTS.md.
    ///
    ///      Note that a full withdrawal does NOT remove the caller from the active-participant
    ///      set here — that happens as part of the next `snapshotAndReset`, so their
    ///      already-earned weight for the current round is never lost. See the design notes at
    ///      the top of this file.
    /// @return paid The amount of the underlying asset actually transferred to the caller.
    function withdraw(uint256 assets) external nonReentrant returns (uint256 paid) {
        if (assets == 0) revert ZeroAmount();
        uint256 bal = principal[msg.sender];
        if (assets > bal) revert InsufficientPrincipal(bal, assets);

        _accrue(msg.sender);

        uint256 vaultClaim = yieldSource.totalAssetsOf(address(this));
        paid = assets > vaultClaim ? vaultClaim : assets;

        uint256 newBal = bal - paid;
        principal[msg.sender] = newBal;
        totalPrincipal -= paid;

        if (paid > 0) {
            yieldSource.withdraw(paid, msg.sender, address(this));
        }

        emit Withdrawn(msg.sender, assets, paid, newBal);
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

    /// @notice Finalizes eligibility weight for every active participant as of right now (the
    ///         instant this executes — always the actual round-close time, since it is only
    ///         ever called synchronously from `DemoPrizeEngine.closeRound`), then opens a fresh
    ///         accrual window starting at that same instant. Also removes any participant left
    ///         with zero principal, so a later deposit always starts from zero stale weight.
    ///         Bounded to at most `2 * MAX_PARTICIPANTS` iterations (one snapshot pass, one
    ///         cleanup pass).
    /// @dev Only the prize engine may call this, and only at round close. See the round-boundary
    ///      and full-withdrawal design notes at the top of this file for why this uses
    ///      `block.timestamp` uniformly instead of a separately-tracked `asOf`.
    function snapshotAndReset()
        external
        onlyPrizeEngine
        returns (address[] memory participants, uint256[] memory weights, uint256 totalWeight)
    {
        uint256 n = activeParticipantList.length;
        participants = new address[](n);
        weights = new uint256[](n);

        for (uint256 i = 0; i < n; ++i) {
            address user = activeParticipantList[i];
            uint256 weight = _weightAsOf(user, block.timestamp);

            participants[i] = user;
            weights[i] = weight;
            totalWeight += weight;

            pendingWeight[user] = 0;
            lastUpdate[user] = block.timestamp;
        }

        // Second, backward pass: remove now-zero-principal participants. Backward iteration
        // makes swap-and-pop removal safe without disturbing indices not yet visited, and never
        // touches an index whose weight hasn't already been recorded above.
        for (uint256 i = activeParticipantList.length; i > 0; --i) {
            address user = activeParticipantList[i - 1];
            if (principal[user] == 0) _removeParticipant(user);
        }

        accrualWindowStart = block.timestamp;
        emit EligibilitySnapshot(block.timestamp, n, totalWeight);
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
