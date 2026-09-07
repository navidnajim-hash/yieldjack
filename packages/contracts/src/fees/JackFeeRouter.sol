// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IPonsV2FeeEscrow } from "../interfaces/IPonsV2FeeEscrow.sol";
import { IPonsV2LaunchFactory, LaunchedToken } from "../interfaces/IPonsV2LaunchFactory.sol";
import { IJackStakingRewards } from "../interfaces/IJackStakingRewards.sol";
import { IWETH } from "../interfaces/IWETH.sol";

/// @title JackFeeRouter
/// @notice Registered as the real $JACK token's pons V2 `creatorFeeRecipient`. Permissionlessly
///         harvests JackFeeRouter's native-ETH creator-fee balance out of pons V2's shared
///         `IPonsV2FeeEscrow`, wraps it to WETH, and splits it 70/20/10 between JACK stakers, the
///         prize reserve, and operations. Non-upgradeable.
///
/// @dev Design decisions:
///      - Deployable before JACK exists: the constructor only takes the already-verified pons
///        factory/escrow/WETH addresses, the prize/ops recipients, and the immutable fee-share
///        split. `configureJack` wires in the real JACK token and its staking contract exactly
///        once, after launch — see that function.
///      - The fee-share split (`stakerShareBps` / `prizeReserveShareBps` / `operationsShareBps`)
///        is immutable and validated to sum to exactly 10,000 bps at construction. Nothing in
///        this contract can ever change it post-deployment — the only lever for changing *who*
///        receives each share is the recipient setters and the timelocked staking migration
///        below, never the split itself.
///      - `harvest` wraps ETH to WETH *before* distributing, so every payout below (prize
///        reserve, operations, and the staking contract via `notifyRewardAmount`) moves through
///        `SafeERC20.safeTransfer`, never a native-ETH push. A malicious or merely non-payable
///        recipient contract therefore can never block its own or anyone else's share of a
///        harvest — see the reentrancy/malicious-recipient test suite.
///      - `harvest` always reads the router's current claimable balance, claims exactly that
///        amount (`IPonsV2FeeEscrow.claim(uint256)`, not the claim-everything overload), and then
///        measures the actual native-ETH balance delta rather than trusting either number — see
///        the inline comments. Splits are computed by giving the operations share the exact
///        remainder after the staker and prize-reserve shares are floored, so the three shares
///        always sum to exactly the amount received: never more, never less.
///      - If nobody is staked when a harvest lands, the staker share is still transferred to the
///        staking contract and `notifyRewardAmount` is still called — `JackStakingRewards` itself
///        is what decides to queue rather than stream it (see that contract). This keeps the
///        "is anyone staked" decision in exactly one place instead of splitting it across both
///        contracts.
///      - `receive()` accepts native ETH only from `feeEscrow` (the only source `harvest` ever
///        expects to be paid from) and rejects everything else — see `receive`.
///      - No swap, price oracle, or JACK-selling logic exists anywhere in this contract, and
///        there is no generic/arbitrary-call admin function. The owner cannot reach a pending
///        staker reward: every WETH-moving code path is inside `harvest`, which always computes
///        the staker share from a fresh claim and sends it straight to `staking`.
///      - Recovering from a compromised or buggy staking contract is only ever possible through
///        `proposeStakingMigration` / `executeStakingMigration`, gated by a mandatory
///        `STAKING_MIGRATION_TIMELOCK` (7 days) that is visible on-chain for its full duration
///        before it can be executed, exactly like the fee-share split, this is not something the
///        owner can do instantly or quietly.
contract JackFeeRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeERC20 for IWETH;

    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Advance notice an owner-proposed staking-contract migration must wait out before
    ///         it can be executed.
    uint256 public constant STAKING_MIGRATION_TIMELOCK = 7 days;

    /// @notice The verified pons V2 launch factory.
    IPonsV2LaunchFactory public immutable factory;

    /// @notice The verified pons V2 fee escrow — `factory.feeEscrow()`, cross-checked against
    ///         this value at construction (see constructor).
    IPonsV2FeeEscrow public immutable feeEscrow;

    /// @notice Canonical Robinhood Chain WETH, verified on-chain (see docs/JACK_ARCHITECTURE.md).
    IWETH public immutable weth;

    /// @notice Share of every harvest routed to `staking`, in basis points. Immutable.
    uint16 public immutable stakerShareBps;

    /// @notice Share of every harvest routed to `prizeReserveRecipient`, in basis points.
    ///         Immutable.
    uint16 public immutable prizeReserveShareBps;

    /// @notice Share of every harvest routed to `operationsRecipient`, in basis points.
    ///         Immutable.
    uint16 public immutable operationsShareBps;

    /// @notice Owner-adjustable payout addresses — adjustable so a treasury address can rotate
    ///         (e.g. a Safe signer-set change) without redeploying the whole router, unlike the
    ///         immutable split itself. Never gates the staker share, which always flows to
    ///         `staking`, not through either of these.
    address public prizeReserveRecipient;
    address public operationsRecipient;

    /// @notice The real, launched $JACK token. Zero until `configureJack`.
    address public jack;

    /// @notice The staking contract currently notified of the staker share on every harvest.
    IJackStakingRewards public staking;

    /// @notice Whether `configureJack` has been called. One-time — see that function.
    bool public configured;

    address public pendingStaking;
    uint256 public stakingMigrationEffectiveAt;

    event PrizeReserveRecipientUpdated(address indexed previousRecipient, address indexed newRecipient);
    event OperationsRecipientUpdated(address indexed previousRecipient, address indexed newRecipient);
    event JackConfigured(address indexed jack, address indexed staking);
    event Harvested(
        address indexed caller,
        uint256 claimedFromEscrow,
        uint256 wrappedToWeth,
        uint256 stakerShare,
        uint256 prizeReserveShare,
        uint256 operationsShare
    );
    event StakingMigrationProposed(address indexed newStaking, uint256 effectiveAt);
    event StakingMigrationExecuted(address indexed oldStaking, address indexed newStaking);
    event StakingMigrationCancelled(address indexed cancelledStaking);
    event Rescued(address indexed token, address indexed to, uint256 amount);

    error ZeroAddress();
    error InvalidFeeShares(uint16 stakerBps, uint16 prizeReserveBps, uint16 operationsBps);
    error FeeEscrowMismatch(address expected, address actual);
    error AlreadyConfigured();
    error NotConfigured();
    error TokenNotLaunched(address token);
    error NotCreatorFeeRecipient(address actualRecipient);
    error UnexpectedQuoteAsset(address pairToken);
    error StakingTokenMismatch(address expected, address actual);
    error RewardTokenMismatch(address expected, address actual);
    error NoPendingMigration();
    error TimelockNotElapsed(uint256 effectiveAt);
    error CannotRescueProtocolToken(address token);
    error UnexpectedEther(address sender);

    constructor(
        IPonsV2LaunchFactory factory_,
        IPonsV2FeeEscrow feeEscrow_,
        IWETH weth_,
        address prizeReserveRecipient_,
        address operationsRecipient_,
        uint16 stakerShareBps_,
        uint16 prizeReserveShareBps_,
        uint16 operationsShareBps_,
        address initialOwner
    ) Ownable(initialOwner) {
        if (address(factory_) == address(0) || address(feeEscrow_) == address(0) || address(weth_) == address(0)) {
            revert ZeroAddress();
        }
        if (prizeReserveRecipient_ == address(0) || operationsRecipient_ == address(0)) revert ZeroAddress();
        if (address(factory_.feeEscrow()) != address(feeEscrow_)) {
            revert FeeEscrowMismatch(address(factory_.feeEscrow()), address(feeEscrow_));
        }
        if (uint256(stakerShareBps_) + prizeReserveShareBps_ + operationsShareBps_ != BPS_DENOMINATOR) {
            revert InvalidFeeShares(stakerShareBps_, prizeReserveShareBps_, operationsShareBps_);
        }

        factory = factory_;
        feeEscrow = feeEscrow_;
        weth = weth_;
        stakerShareBps = stakerShareBps_;
        prizeReserveShareBps = prizeReserveShareBps_;
        operationsShareBps = operationsShareBps_;

        prizeReserveRecipient = prizeReserveRecipient_;
        operationsRecipient = operationsRecipient_;

        emit PrizeReserveRecipientUpdated(address(0), prizeReserveRecipient_);
        emit OperationsRecipientUpdated(address(0), operationsRecipient_);
    }

    // ---------------------------------------------------------------------
    // One-time JACK configuration
    // ---------------------------------------------------------------------

    /// @notice One-time wiring of the real, launched JACK token and its initial staking
    ///         contract. Callable exactly once. Validates the launch record read live from
    ///         `factory.getLaunchedToken` — the token must exist, must have this router as its
    ///         `creatorFeeRecipient`, and must have launched against the native ETH quote asset
    ///         (`pairToken == address(0)`) — and validates `stakingContract`'s own immutables
    ///         match (`stakingToken() == jackToken`, `rewardToken() == weth`).
    function configureJack(address jackToken, IJackStakingRewards stakingContract) external onlyOwner {
        if (configured) revert AlreadyConfigured();
        if (jackToken == address(0) || address(stakingContract) == address(0)) revert ZeroAddress();

        LaunchedToken memory launch = factory.getLaunchedToken(jackToken);
        if (!launch.exists) revert TokenNotLaunched(jackToken);
        if (launch.creatorFeeRecipient != address(this)) revert NotCreatorFeeRecipient(launch.creatorFeeRecipient);
        if (launch.pairToken != address(0)) revert UnexpectedQuoteAsset(launch.pairToken);
        _validateStakingImmutables(jackToken, stakingContract);

        jack = jackToken;
        staking = stakingContract;
        configured = true;

        emit JackConfigured(jackToken, address(stakingContract));
    }

    // ---------------------------------------------------------------------
    // Harvest — permissionless
    // ---------------------------------------------------------------------

    /// @notice Claims this router's full claimable native-ETH balance from the pons V2 fee
    ///         escrow, wraps it to WETH, and sends the 70/20/10 split to staking / the prize
    ///         reserve / operations. Callable by anyone, any time, as often as desired — a no-op
    ///         (returns 0, no events beyond none) when there is nothing to claim.
    /// @return received The actual amount of WETH distributed (equal to the actual native ETH
    ///         received from the escrow).
    function harvest() external nonReentrant returns (uint256 received) {
        if (!configured) revert NotConfigured();

        uint256 claimable = feeEscrow.balanceOf(address(this));
        if (claimable == 0) return 0;

        // Claim exactly the amount just read (not the claim-everything overload) so the splits
        // computed below always match what was actually pulled this call, then measure the
        // real balance delta rather than trusting either the requested amount or the escrow's
        // own return value.
        uint256 balanceBefore = address(this).balance;
        feeEscrow.claim(claimable);
        received = address(this).balance - balanceBefore;
        if (received == 0) return 0;

        weth.deposit{ value: received }();

        (uint256 stakerShare, uint256 prizeShare, uint256 opsShare) = _splitAmount(received);

        if (prizeShare > 0) weth.safeTransfer(prizeReserveRecipient, prizeShare);
        if (opsShare > 0) weth.safeTransfer(operationsRecipient, opsShare);
        if (stakerShare > 0) {
            weth.safeTransfer(address(staking), stakerShare);
            staking.notifyRewardAmount(stakerShare);
        }

        emit Harvested(msg.sender, claimable, received, stakerShare, prizeShare, opsShare);
    }

    // ---------------------------------------------------------------------
    // Recipient configuration
    // ---------------------------------------------------------------------

    function setPrizeReserveRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        emit PrizeReserveRecipientUpdated(prizeReserveRecipient, newRecipient);
        prizeReserveRecipient = newRecipient;
    }

    function setOperationsRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        emit OperationsRecipientUpdated(operationsRecipient, newRecipient);
        operationsRecipient = newRecipient;
    }

    // ---------------------------------------------------------------------
    // Timelocked staking-contract migration
    // ---------------------------------------------------------------------

    /// @notice Proposes replacing the staking contract notified on every harvest. Takes effect
    ///         no sooner than `STAKING_MIGRATION_TIMELOCK` after this call — see
    ///         `executeStakingMigration`. A new proposal replaces any earlier pending one and
    ///         resets the clock.
    function proposeStakingMigration(IJackStakingRewards newStaking) external onlyOwner {
        if (!configured) revert NotConfigured();
        if (address(newStaking) == address(0)) revert ZeroAddress();
        _validateStakingImmutables(jack, newStaking);

        pendingStaking = address(newStaking);
        stakingMigrationEffectiveAt = block.timestamp + STAKING_MIGRATION_TIMELOCK;

        emit StakingMigrationProposed(address(newStaking), stakingMigrationEffectiveAt);
    }

    /// @notice Applies a previously proposed staking-contract migration once its timelock has
    ///         elapsed.
    function executeStakingMigration() external onlyOwner {
        if (pendingStaking == address(0)) revert NoPendingMigration();
        if (block.timestamp < stakingMigrationEffectiveAt) revert TimelockNotElapsed(stakingMigrationEffectiveAt);

        address oldStaking = address(staking);
        staking = IJackStakingRewards(pendingStaking);
        pendingStaking = address(0);
        stakingMigrationEffectiveAt = 0;

        emit StakingMigrationExecuted(oldStaking, address(staking));
    }

    /// @notice Cancels a pending staking-contract migration before it takes effect.
    function cancelStakingMigration() external onlyOwner {
        if (pendingStaking == address(0)) revert NoPendingMigration();
        address cancelled = pendingStaking;
        pendingStaking = address(0);
        stakingMigrationEffectiveAt = 0;
        emit StakingMigrationCancelled(cancelled);
    }

    // ---------------------------------------------------------------------
    // Rescue
    // ---------------------------------------------------------------------

    /// @notice Recovers a token that is not WETH — e.g. an unrelated token mistakenly sent here.
    ///         This router never holds JACK, so only WETH needs to be excluded. Cannot reach a
    ///         pending staker reward: WETH is unconditionally rejected regardless of any
    ///         "surplus balance" calculation.
    function rescue(IERC20 token, address to, uint256 amount) external onlyOwner {
        if (address(token) == address(weth)) revert CannotRescueProtocolToken(address(token));
        if (to == address(0)) revert ZeroAddress();
        token.safeTransfer(to, amount);
        emit Rescued(address(token), to, amount);
    }

    // ---------------------------------------------------------------------
    // Receive
    // ---------------------------------------------------------------------

    /// @notice Accepts native ETH only from `feeEscrow` — the only source `harvest` ever expects
    ///         to be paid from. Rejects every other sender, so this contract can never be used as
    ///         an incidental ETH-holding address by anyone else.
    receive() external payable {
        if (msg.sender != address(feeEscrow)) revert UnexpectedEther(msg.sender);
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    /// @dev Gives the operations share the exact remainder after the (floor-rounded) staker and
    ///      prize-reserve shares, so the three shares always sum to exactly `amount` — never
    ///      more, never less — regardless of basis-point rounding.
    function _splitAmount(uint256 amount)
        private
        view
        returns (uint256 stakerShare, uint256 prizeShare, uint256 opsShare)
    {
        stakerShare = (amount * stakerShareBps) / BPS_DENOMINATOR;
        prizeShare = (amount * prizeReserveShareBps) / BPS_DENOMINATOR;
        opsShare = amount - stakerShare - prizeShare;
    }

    function _validateStakingImmutables(address expectedStakingToken, IJackStakingRewards candidate) private view {
        address candidateStakingToken = candidate.stakingToken();
        if (candidateStakingToken != expectedStakingToken) {
            revert StakingTokenMismatch(expectedStakingToken, candidateStakingToken);
        }
        address candidateRewardToken = candidate.rewardToken();
        if (candidateRewardToken != address(weth)) {
            revert RewardTokenMismatch(address(weth), candidateRewardToken);
        }
    }
}
