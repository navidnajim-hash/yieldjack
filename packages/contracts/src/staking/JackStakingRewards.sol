// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title JackStakingRewards
/// @notice Stake real $JACK, earn real WETH funded by JackFeeRouter's harvested creator-fee
///         share. Non-upgradeable. Rewards stream linearly over a rolling seven-day window using
///         the standard "rewardPerToken" accounting pattern (see THIRD_PARTY_NOTICES.md for
///         design provenance — this is an original implementation, not vendored code), so a
///         large harvest is never paid out as an instant lump sum to whoever happens to be
///         staked the instant it lands: it accrues by stake share and time, exactly like every
///         other harvest.
///
/// @dev Design decisions:
///      - `distributor` (JackFeeRouter) is immutable, set once at construction — deploy this
///        contract only after JackFeeRouter exists, since staking must know its one authorized
///        reward source up front. There is no owner-mutable distributor: recovering from a bad
///        router means deploying a new JackStakingRewards and migrating via JackFeeRouter's own
///        timelocked staking-contract migration, never rewiring this contract in place.
///      - Zero-staker queuing: `notifyRewardAmount` while `totalStaked == 0` never starts a
///        stream (there is nobody for `rewardPerToken` to credit) — it only grows
///        `queuedRewards`. The invariant "totalStaked == 0 implies rewardRate == 0" is
///        maintained on the withdrawal side too: whenever `withdraw` brings `totalStaked` back
///        to zero mid-stream, the stream's remaining announced-but-unstreamed amount is folded
///        into `queuedRewards` and `rewardRate` is zeroed. The first `stake()` after either path
///        starts a fresh seven-day stream from every queued WETH. No reward token is ever
///        silently stranded — see `_startStream` / `_pauseStreamIfLive`.
///      - Reward top-ups (multiple harvests inside one still-active seven-day window) combine
///        the undistributed remainder of the current stream with the new amount and restart a
///        full seven-day window from `block.timestamp` — the standard, widely-audited Synthetix
///        StakingRewards pattern (see THIRD_PARTY_NOTICES.md). This is also what makes a stake
///        placed one second before a huge harvest land safely: that harvest's tokens stream
///        linearly over the next seven days, not instantly.
///      - `totalStaked` is tracked purely by internal accounting (`stake`/`withdraw`), never by
///        reading `stakingToken.balanceOf(address(this))`. A direct JACK transfer to this
///        contract (bypassing `stake`) is therefore never credited to anyone's balance, never
///        inflates anyone's rewards, and is not withdrawable or rescuable (see `rescue`) — it is
///        simply inert. Likewise a direct WETH transfer (bypassing `notifyRewardAmount`) sits as
///        unaccounted balance, never streamed to anyone, never rescuable. Neither can corrupt
///        accounting or be used to claim another staker's rewards.
///      - Deposits (`stake`) may be paused; `withdraw`, `claimReward`, and `exit` never carry a
///        `whenNotPaused` modifier and always remain available, mirroring YieldJackVault's pause
///        design elsewhere in this repository.
///      - Every payout (`withdraw` returns staked JACK, `claimReward` pays WETH) moves through
///        `SafeERC20.safeTransfer`, never a native-ETH push — a malicious or merely
///        non-payable recipient contract can never block its own or anyone else's transfer.
contract JackStakingRewards is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Length of one reward stream.
    uint256 public constant REWARDS_DURATION = 7 days;

    uint256 private constant PRECISION = 1e18;

    /// @notice The real $JACK token. Immutable — construct this contract only after JACK exists.
    IERC20 public immutable stakingToken;

    /// @notice Canonical Robinhood Chain WETH. Immutable.
    IERC20 public immutable rewardToken;

    /// @notice The only address authorized to call `notifyRewardAmount` — JackFeeRouter.
    address public immutable distributor;

    /// @notice Sum of every staker's current balance.
    uint256 public totalStaked;

    /// @notice Each staker's current staked balance.
    mapping(address => uint256) public balanceOf;

    /// @notice Timestamp the current reward stream ends. Equal to `block.timestamp` whenever no
    ///         stream is live (including while `totalStaked == 0`, see `_pauseStreamIfLive`).
    uint256 public periodFinish;

    /// @notice Reward tokens emitted per second of the current stream. Zero whenever
    ///         `totalStaked == 0`.
    uint256 public rewardRate;

    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    /// @notice WETH received via `notifyRewardAmount` that is not yet part of an active stream
    ///         because nobody was staked at the time it arrived (or the last staker withdrew
    ///         before the previous stream finished). Folded into a fresh stream the moment
    ///         `totalStaked` becomes nonzero again. See contract-level notes.
    uint256 public queuedRewards;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 amount);
    event RewardAdded(uint256 amount, uint256 newRewardRate, uint256 periodFinish);
    event RewardQueued(uint256 amount, uint256 totalQueued);
    event RewardStreamPaused(uint256 queuedAmount);
    event Rescued(address indexed token, address indexed to, uint256 amount);

    error ZeroAmount();
    error ZeroAddress();
    error NotDistributor(address caller);
    error InsufficientBalance(uint256 requested, uint256 available);
    error CannotRescueProtocolToken(address token);
    error InsufficientRewardBalance(uint256 required, uint256 available);

    modifier onlyDistributor() {
        if (msg.sender != distributor) revert NotDistributor(msg.sender);
        _;
    }

    /// @dev Standard Synthetix-style checkpoint: freezes `rewardPerTokenStored` as of the last
    ///      moment reward accrual actually applies, then (for a real account) settles their
    ///      earned-but-unpaid reward into `rewards[account]` before any balance change below can
    ///      affect future accrual. Called with `address(0)` from `notifyRewardAmount`, which only
    ///      needs the global checkpoint.
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    constructor(IERC20 stakingToken_, IERC20 rewardToken_, address distributor_, address initialOwner)
        Ownable(initialOwner)
    {
        if (address(stakingToken_) == address(0) || address(rewardToken_) == address(0)) revert ZeroAddress();
        if (distributor_ == address(0)) revert ZeroAddress();
        stakingToken = stakingToken_;
        rewardToken = rewardToken_;
        distributor = distributor_;
    }

    // ---------------------------------------------------------------------
    // Staking
    // ---------------------------------------------------------------------

    function stake(uint256 amount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        if (amount == 0) revert ZeroAmount();

        if (totalStaked == 0 && queuedRewards > 0) {
            uint256 queued = queuedRewards;
            queuedRewards = 0;
            _startStream(queued);
        }

        totalStaked += amount;
        balanceOf[msg.sender] += amount;

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
    }

    /// @notice Withdraws `amount` of staked JACK back to the caller. Always available, including
    ///         while `stake` is paused.
    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        if (amount == 0) revert ZeroAmount();
        uint256 bal = balanceOf[msg.sender];
        if (amount > bal) revert InsufficientBalance(amount, bal);

        balanceOf[msg.sender] = bal - amount;
        totalStaked -= amount;

        if (totalStaked == 0) {
            _pauseStreamIfLive();
        }

        stakingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Pays out the caller's full earned-but-unclaimed WETH. Always available, including
    ///         while `stake` is paused. A no-op (not a revert) when nothing is owed.
    function claimReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward == 0) return;

        rewards[msg.sender] = 0;
        rewardToken.safeTransfer(msg.sender, reward);

        emit RewardPaid(msg.sender, reward);
    }

    /// @notice Withdraws the caller's full staked balance and claims their full earned reward in
    ///         one call.
    function exit() external {
        withdraw(balanceOf[msg.sender]);
        claimReward();
    }

    // ---------------------------------------------------------------------
    // Distributor (JackFeeRouter)
    // ---------------------------------------------------------------------

    /// @notice Starts or extends the reward stream with `amount` of WETH, which the caller
    ///         (JackFeeRouter) must already have transferred to this contract before calling.
    ///         Combines any undistributed remainder of an in-progress stream with `amount`, then
    ///         streams the total over a fresh `REWARDS_DURATION`. If nobody is staked right now,
    ///         the whole amount is queued instead of starting a stream nobody can earn from — see
    ///         contract-level notes.
    function notifyRewardAmount(uint256 amount) external onlyDistributor nonReentrant updateReward(address(0)) {
        if (amount == 0) revert ZeroAmount();

        if (totalStaked == 0) {
            queuedRewards += amount;
            emit RewardQueued(amount, queuedRewards);
            return;
        }

        _startStream(amount);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rewardPerTokenStored;
        return
            rewardPerTokenStored + ((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * PRECISION)
                / totalStaked;
    }

    /// @notice Total WETH `account` has earned so far (claimed or not).
    function earned(address account) public view returns (uint256) {
        return
            (balanceOf[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / PRECISION + rewards[account];
    }

    /// @notice Total WETH this contract is currently obligated to stream out over the remainder
    ///         of the active period. Excludes `queuedRewards`, which is not yet streaming.
    function activeStreamRemaining() external view returns (uint256) {
        uint256 remaining = periodFinish > block.timestamp ? periodFinish - block.timestamp : 0;
        return remaining * rewardRate;
    }

    /// @notice Total WETH `rewardRate` would emit over one full `REWARDS_DURATION` at the
    ///         current rate.
    function getRewardForDuration() external view returns (uint256) {
        return rewardRate * REWARDS_DURATION;
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    /// @notice Pauses new stakes only. Withdrawals and reward claims are never affected — see
    ///         `withdraw` / `claimReward` / `exit`, none of which carry `whenNotPaused`.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Recovers a token that is neither `stakingToken` (JACK) nor `rewardToken` (WETH) —
    ///         e.g. an unrelated token mistakenly sent here. Can never touch JACK or WETH, staked
    ///         or stray, accounted-for or not: both addresses are unconditionally rejected
    ///         regardless of any "surplus balance" calculation, so no owner code path — buggy or
    ///         otherwise — can ever reach a staker's principal or earned/queued/streaming reward.
    function rescue(IERC20 token, address to, uint256 amount) external onlyOwner {
        if (address(token) == address(stakingToken) || address(token) == address(rewardToken)) {
            revert CannotRescueProtocolToken(address(token));
        }
        if (to == address(0)) revert ZeroAddress();
        token.safeTransfer(to, amount);
        emit Rescued(address(token), to, amount);
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    /// @dev Combines `amount` with any live undistributed remainder and streams the total over a
    ///      fresh `REWARDS_DURATION` starting now. Both call sites guarantee `totalStaked > 0`
    ///      and `queuedRewards == 0` by construction (queuedRewards is only ever nonzero while
    ///      totalStaked == 0, and stake() drains it in the same call that makes totalStaked
    ///      nonzero — see `stake`), so there is nothing else to fold in here. Requires the
    ///      reward tokens this promises to already be held by this contract.
    function _startStream(uint256 amount) private {
        uint256 remaining = periodFinish > block.timestamp ? periodFinish - block.timestamp : 0;
        uint256 leftover = remaining * rewardRate;

        uint256 totalReward = amount + leftover;
        uint256 newRate = totalReward / REWARDS_DURATION;

        uint256 required = newRate * REWARDS_DURATION;
        uint256 balance = rewardToken.balanceOf(address(this));
        if (required > balance) revert InsufficientRewardBalance(required, balance);

        rewardRate = newRate;
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + REWARDS_DURATION;

        emit RewardAdded(amount, newRate, periodFinish);
    }

    /// @dev Called when a withdrawal brings `totalStaked` to zero. If a stream is still live,
    ///      folds its remaining announced-but-unstreamed amount into `queuedRewards` and zeroes
    ///      `rewardRate` so `rewardPerToken()` correctly stops accruing to nobody — otherwise
    ///      those tokens would sit in the contract, permanently unattributed to any staker once
    ///      `periodFinish` passes with nobody there to have earned them. See contract-level notes.
    function _pauseStreamIfLive() private {
        if (rewardRate == 0) return;
        uint256 remaining = periodFinish > block.timestamp ? periodFinish - block.timestamp : 0;
        uint256 unstreamed = remaining * rewardRate;

        rewardRate = 0;
        periodFinish = block.timestamp;

        if (unstreamed > 0) {
            queuedRewards += unstreamed;
            emit RewardStreamPaused(unstreamed);
        }
    }
}
