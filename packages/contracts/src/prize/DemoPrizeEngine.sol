// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IPrizeEngine } from "../interfaces/IPrizeEngine.sol";
import { IRandomnessProvider } from "../interfaces/IRandomnessProvider.sol";
import { YieldJackVault } from "../vault/YieldJackVault.sol";

/// @title DemoPrizeEngine
/// @notice Runs the YieldJack draw lifecycle: OPEN -> RANDOMNESS_REQUESTED -> AWARDED ->
///         CLAIMED/EXPIRED. Every state transition is permissionless (anyone may call
///         `closeRound`, `finalize`, `claim`'s expiry-sibling `rollover`) so the frontend, the
///         optional keeper, or any third party can advance a round — the administrator has no
///         special power over winner selection or fund custody.
///
/// @dev Key invariants (see docs/ACCOUNTING_INVARIANTS.md for the full spec):
///      - `winner` is derived deterministically from `IRandomnessProvider`'s revealed value and
///        the immutable weight snapshot taken at close; no function lets anyone, including the
///        owner, overwrite a round's winner once set.
///      - A round's `prizeAmount` is funded only from `YieldJackVault.pullYield` (realized
///        yield, never principal) and `SponsorRegistry` contributions. Principal is never
///        readable or transferable from this contract.
///      - `MAX_PARTICIPANTS` (see `YieldJackVault`) bounds every loop in this contract to a
///        known gas ceiling. TESTNET ONLY — see docs/PRODUCTION_ROADMAP.md.
contract DemoPrizeEngine is IPrizeEngine, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Round {
        RoundState state;
        uint64 startTime;
        uint64 endTime;
        uint64 awardedAt;
        uint64 claimDeadline;
        uint256 prizeAmount;
        uint256 totalWeight;
        uint256 requestId;
        address winner;
        bool claimed;
        address[] participants;
        uint256[] weights;
        address lastSponsor;
        string lastSponsorMetadata;
        uint256 sponsorAmount;
        uint256 sponsorJackBurned;
        uint256 sponsorCount;
    }

    /// @notice Read-only summary of a round, omitting the (potentially large) participant
    ///         arrays — use `getRoundParticipants` for those.
    struct RoundSummary {
        RoundState state;
        uint64 startTime;
        uint64 endTime;
        uint64 awardedAt;
        uint64 claimDeadline;
        uint256 prizeAmount;
        uint256 totalWeight;
        uint256 requestId;
        address winner;
        bool claimed;
        uint256 participantCount;
        address lastSponsor;
        string lastSponsorMetadata;
        uint256 sponsorAmount;
        uint256 sponsorJackBurned;
        uint256 sponsorCount;
    }

    YieldJackVault public immutable vault;
    IRandomnessProvider public immutable randomnessProvider;
    IERC20 public immutable asset;

    /// @notice SponsorRegistry authorized to add sponsor funds. Set exactly once by the owner
    ///         during deployment wiring; permanently locked thereafter (see YieldJackVault's
    ///         `setPrizeEngine` for the same pattern and rationale).
    address public sponsorRegistry;

    /// @notice Length of a round, in seconds. Production default is 7 days; local/testnet demo
    ///         deployments use a much shorter value. Changing this only affects rounds opened
    ///         after the change — never the currently open round.
    uint256 public roundDuration;

    /// @notice Time after `awardedAt` during which the winner may claim before anyone may roll
    ///         the prize forward. Frozen into each round at award time, so changing this can
    ///         never retroactively shorten a round already in flight.
    uint256 public claimExpiry;

    uint256 public currentRoundId;
    uint256 public pendingRolloverFunds;

    mapping(uint256 => Round) private rounds;

    event PrizeEngineDeployed(address indexed vault, address indexed randomnessProvider);
    event SponsorRegistrySet(address indexed registry);
    event RoundDurationUpdated(uint256 newDuration);
    event ClaimExpiryUpdated(uint256 newExpiry);
    event RoundOpened(uint256 indexed roundId, uint64 startTime, uint64 endTime, uint256 openingPrizeAmount);
    event RoundClosed(uint256 indexed roundId, uint256 prizeAmount, uint256 totalWeight, uint256 requestId);
    event RoundClosedNoDraw(uint256 indexed roundId, uint256 totalWeight, uint256 rolledForward);
    event WinnerSelected(uint256 indexed roundId, address indexed winner, uint256 prizeAmount, uint256 randomValue);
    event PrizeClaimed(uint256 indexed roundId, address indexed winner, uint256 amount);
    event PrizeRolledOver(uint256 indexed roundId, uint256 amount);
    event SponsorFundsAdded(uint256 indexed roundId, address indexed sponsor, uint256 amount, string metadata);

    error ZeroAddress();
    error SponsorRegistryAlreadySet();
    error NotSponsorRegistry(address caller);
    error RoundNotOpen(uint256 roundId);
    error RoundNotExpired(uint256 endTime);
    error RoundNotAwaitingRandomness(uint256 roundId);
    error RandomnessNotFulfilled(uint256 requestId);
    error RoundNotAwarded(uint256 roundId);
    error NotWinner(address caller);
    error AlreadyClaimed(uint256 roundId);
    error ClaimWindowExpired(uint256 roundId);
    error ClaimWindowNotExpired(uint256 claimDeadline);
    error VaultPaused();

    modifier onlySponsorRegistry() {
        if (msg.sender != sponsorRegistry) revert NotSponsorRegistry(msg.sender);
        _;
    }

    constructor(
        YieldJackVault vault_,
        IRandomnessProvider randomnessProvider_,
        address initialOwner,
        uint256 roundDuration_,
        uint256 claimExpiry_
    ) Ownable(initialOwner) {
        if (address(vault_) == address(0) || address(randomnessProvider_) == address(0)) {
            revert ZeroAddress();
        }
        vault = vault_;
        randomnessProvider = randomnessProvider_;
        asset = vault_.asset();
        roundDuration = roundDuration_;
        claimExpiry = claimExpiry_;

        emit PrizeEngineDeployed(address(vault_), address(randomnessProvider_));
        _openRound();
    }

    // ---------------------------------------------------------------------
    // Admin wiring / config (no winner or custody power — see the design notes above)
    // ---------------------------------------------------------------------

    function setSponsorRegistry(address registry) external onlyOwner {
        if (sponsorRegistry != address(0)) revert SponsorRegistryAlreadySet();
        if (registry == address(0)) revert ZeroAddress();
        sponsorRegistry = registry;
        emit SponsorRegistrySet(registry);
    }

    function setRoundDuration(uint256 newDuration) external onlyOwner {
        roundDuration = newDuration;
        emit RoundDurationUpdated(newDuration);
    }

    function setClaimExpiry(uint256 newExpiry) external onlyOwner {
        claimExpiry = newExpiry;
        emit ClaimExpiryUpdated(newExpiry);
    }

    // ---------------------------------------------------------------------
    // Round lifecycle — every function below is permissionless
    // ---------------------------------------------------------------------

    /// @notice Closes the current round once its `endTime` has passed: snapshots eligibility,
    ///         pulls any realized yield into escrow, and either requests randomness (if there
    ///         is a nonzero prize and at least one eligible participant) or resolves the round
    ///         with no draw and rolls any escrowed funds forward. Always opens the next round.
    /// @dev Reverts while the vault is paused — an administrative pause stops new draw creation
    ///      the same way it stops new deposits, without affecting `finalize`/`claim`/`rollover`
    ///      for rounds already in flight.
    function closeRound() external nonReentrant {
        if (vault.paused()) revert VaultPaused();

        uint256 roundId = currentRoundId;
        Round storage r = rounds[roundId];
        if (r.state != RoundState.OPEN) revert RoundNotOpen(roundId);
        if (block.timestamp < r.endTime) revert RoundNotExpired(r.endTime);

        (address[] memory participants, uint256[] memory weights, uint256 totalWeight) =
            vault.snapshotAndReset(r.endTime, block.timestamp);

        r.totalWeight = totalWeight;
        for (uint256 i = 0; i < participants.length; ++i) {
            r.participants.push(participants[i]);
            r.weights.push(weights[i]);
        }

        if (totalWeight > 0) {
            uint256 avail = vault.availableYield();
            if (avail > 0) {
                r.prizeAmount += vault.pullYield(avail, address(this));
            }
        }

        if (totalWeight == 0 || r.prizeAmount == 0) {
            r.state = RoundState.EXPIRED;
            uint256 rolled = r.prizeAmount;
            r.prizeAmount = 0;
            _fundFutureRound(rolled);
            emit RoundClosedNoDraw(roundId, totalWeight, rolled);
        } else {
            uint256 requestId = randomnessProvider.requestRandomness(roundId);
            r.requestId = requestId;
            r.state = RoundState.RANDOMNESS_REQUESTED;
            emit RoundClosed(roundId, r.prizeAmount, totalWeight, requestId);
        }

        _openRound();
    }

    /// @notice Finalizes `roundId` once its randomness request has been fulfilled, selecting a
    ///         winner deterministically from the weight snapshot. No administrator involvement.
    function finalize(uint256 roundId) external {
        Round storage r = rounds[roundId];
        if (r.state != RoundState.RANDOMNESS_REQUESTED) revert RoundNotAwaitingRandomness(roundId);
        if (!randomnessProvider.isFulfilled(r.requestId)) revert RandomnessNotFulfilled(r.requestId);

        uint256 randomValue = randomnessProvider.getRandomness(r.requestId);
        address winner = _selectWinner(r, randomValue);

        r.winner = winner;
        r.state = RoundState.AWARDED;
        r.awardedAt = uint64(block.timestamp);
        r.claimDeadline = uint64(block.timestamp + claimExpiry);

        emit WinnerSelected(roundId, winner, r.prizeAmount, randomValue);
    }

    /// @notice Claims the prize for `roundId`. Only the selected winner may call this, only
    ///         once, and only before `claimDeadline`.
    function claim(uint256 roundId) external nonReentrant {
        Round storage r = rounds[roundId];
        if (r.state != RoundState.AWARDED) revert RoundNotAwarded(roundId);
        if (msg.sender != r.winner) revert NotWinner(msg.sender);
        if (r.claimed) revert AlreadyClaimed(roundId);
        if (block.timestamp >= r.claimDeadline) revert ClaimWindowExpired(roundId);

        r.claimed = true;
        r.state = RoundState.CLAIMED;
        uint256 amount = r.prizeAmount;

        asset.safeTransfer(msg.sender, amount);

        emit PrizeClaimed(roundId, msg.sender, amount);
    }

    /// @notice Rolls an unclaimed, expired prize forward into a future round. Permissionless.
    function rollover(uint256 roundId) external {
        Round storage r = rounds[roundId];
        if (r.state != RoundState.AWARDED) revert RoundNotAwarded(roundId);
        if (block.timestamp < r.claimDeadline) revert ClaimWindowNotExpired(r.claimDeadline);

        r.state = RoundState.EXPIRED;
        uint256 rolled = r.prizeAmount;
        r.prizeAmount = 0;
        _fundFutureRound(rolled);

        emit PrizeRolledOver(roundId, rolled);
    }

    // ---------------------------------------------------------------------
    // Sponsor hook
    // ---------------------------------------------------------------------

    /// @inheritdoc IPrizeEngine
    /// @dev Assumes `amount` of `asset` has already been transferred to this contract by
    ///      `SponsorRegistry` before this call. Only ever touches `prizeAmount` — never a
    ///      user's weight — so sponsorship cannot buy better base odds.
    function addSponsorFunds(
        uint256 roundId,
        uint256 amount,
        address sponsor,
        uint256 jackBurned,
        string calldata metadata
    ) external onlySponsorRegistry {
        Round storage r = rounds[roundId];
        if (r.state != RoundState.OPEN) revert RoundNotOpen(roundId);

        r.prizeAmount += amount;
        r.lastSponsor = sponsor;
        r.lastSponsorMetadata = metadata;
        r.sponsorAmount += amount;
        r.sponsorJackBurned += jackBurned;
        r.sponsorCount += 1;

        emit SponsorFundsAdded(roundId, sponsor, amount, metadata);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @inheritdoc IPrizeEngine
    function roundState(uint256 roundId) external view returns (RoundState) {
        return rounds[roundId].state;
    }

    function getRound(uint256 roundId) external view returns (RoundSummary memory summary) {
        Round storage r = rounds[roundId];
        summary = RoundSummary({
            state: r.state,
            startTime: r.startTime,
            endTime: r.endTime,
            awardedAt: r.awardedAt,
            claimDeadline: r.claimDeadline,
            prizeAmount: r.prizeAmount,
            totalWeight: r.totalWeight,
            requestId: r.requestId,
            winner: r.winner,
            claimed: r.claimed,
            participantCount: r.participants.length,
            lastSponsor: r.lastSponsor,
            lastSponsorMetadata: r.lastSponsorMetadata,
            sponsorAmount: r.sponsorAmount,
            sponsorJackBurned: r.sponsorJackBurned,
            sponsorCount: r.sponsorCount
        });
    }

    function getRoundParticipants(uint256 roundId)
        external
        view
        returns (address[] memory participants, uint256[] memory weights)
    {
        Round storage r = rounds[roundId];
        return (r.participants, r.weights);
    }

    /// @notice Live estimate (in basis points, 10_000 = 100%) of `user`'s chance of winning the
    ///         currently open round if it closed right now. Purely a preview — the real outcome
    ///         depends on eligibility at actual close time and on-chain randomness.
    function estimatedChanceBps(address user) external view returns (uint256) {
        (address[] memory participants, uint256[] memory weights, uint256 totalWeight) =
            vault.previewAllWeights(block.timestamp);
        if (totalWeight == 0) return 0;
        for (uint256 i = 0; i < participants.length; ++i) {
            if (participants[i] == user) {
                return (weights[i] * 10_000) / totalWeight;
            }
        }
        return 0;
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    function _openRound() private {
        currentRoundId += 1;
        uint256 id = currentRoundId;
        Round storage r = rounds[id];
        r.state = RoundState.OPEN;
        r.startTime = uint64(block.timestamp);
        r.endTime = uint64(block.timestamp + roundDuration);

        if (pendingRolloverFunds > 0) {
            r.prizeAmount = pendingRolloverFunds;
            pendingRolloverFunds = 0;
        }

        emit RoundOpened(id, r.startTime, r.endTime, r.prizeAmount);
    }

    /// @notice Adds `amount` to whichever round is best positioned to award it: the currently
    ///         open round if there is one, otherwise a pending buffer applied the moment the
    ///         next round opens. Used for both rollovers and the "no eligible weight" path.
    function _fundFutureRound(uint256 amount) private {
        if (amount == 0) return;
        Round storage cur = rounds[currentRoundId];
        if (cur.state == RoundState.OPEN) {
            cur.prizeAmount += amount;
        } else {
            pendingRolloverFunds += amount;
        }
    }

    function _selectWinner(Round storage r, uint256 randomValue) private view returns (address) {
        uint256 target = randomValue % r.totalWeight;
        uint256 cumulative;
        uint256 n = r.participants.length;
        for (uint256 i = 0; i < n; ++i) {
            cumulative += r.weights[i];
            if (target < cumulative) return r.participants[i];
        }
        // Unreachable if weights sum to totalWeight as constructed, but a safe fallback avoids
        // ever bricking finalize() due to a rounding edge case.
        return r.participants[n - 1];
    }
}
