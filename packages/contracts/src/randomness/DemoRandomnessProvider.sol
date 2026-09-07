// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IRandomnessProvider } from "../interfaces/IRandomnessProvider.sol";

/// @title DemoRandomnessProvider
/// @notice TESTNET ONLY. Derives "randomness" from a future block's hash.
///
/// @dev THIS IS NOT SECURE RANDOMNESS AND MUST NEVER BE USED ON MAINNET.
///      Block hashes are known in advance to block producers and, once mined, are public
///      information that a sufficiently motivated actor (including whoever calls
///      `fulfillRandomness`) can choose the timing of, or in adversarial settings even
///      influence. This contract exists only so the YieldJack testnet MVP can demonstrate a
///      complete request -> fulfill -> finalize lifecycle without depending on an external
///      VRF service. A production deployment MUST replace this with a verifiable randomness
///      provider (see docs/PRODUCTION_ROADMAP.md) implementing the same `IRandomnessProvider`
///      interface — no changes to `DemoPrizeEngine` would be required.
contract DemoRandomnessProvider is IRandomnessProvider, Ownable {
    struct Request {
        uint256 roundId;
        uint256 targetBlock;
        bool fulfilled;
        uint256 randomValue;
    }

    event PrizeEngineSet(address indexed engine);
    event RandomnessRequested(uint256 indexed requestId, uint256 indexed roundId, uint256 targetBlock);
    event RandomnessFulfilled(uint256 indexed requestId, address indexed fulfiller, uint256 randomValue);

    error NotPrizeEngine(address caller);
    error PrizeEngineAlreadySet();
    error ZeroAddress();
    error UnknownRequest(uint256 requestId);
    error AlreadyFulfilled(uint256 requestId);
    error TooEarlyToFulfill(uint256 readyAtBlock);
    error NotFulfilled(uint256 requestId);

    /// @notice Number of blocks that must pass after a request before it may be fulfilled.
    ///         A larger delay makes it marginally harder for a single actor to both request
    ///         and immediately know the resulting value — it does NOT make this secure.
    uint256 public constant MIN_DELAY_BLOCKS = 1;

    address public prizeEngine;
    uint256 public nextRequestId = 1;
    mapping(uint256 => Request) public requests;

    modifier onlyPrizeEngine() {
        if (msg.sender != prizeEngine) revert NotPrizeEngine(msg.sender);
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) { }

    /// @notice One-time wiring of the prize engine address (see YieldJackVault for the same
    ///         pattern and rationale). Permanently locked after the first call.
    function setPrizeEngine(address engine) external onlyOwner {
        if (prizeEngine != address(0)) revert PrizeEngineAlreadySet();
        if (engine == address(0)) revert ZeroAddress();
        prizeEngine = engine;
        emit PrizeEngineSet(engine);
    }

    /// @inheritdoc IRandomnessProvider
    function requestRandomness(uint256 roundId) external onlyPrizeEngine returns (uint256 requestId) {
        requestId = nextRequestId++;
        uint256 targetBlock = block.number + MIN_DELAY_BLOCKS;
        requests[requestId] = Request({ roundId: roundId, targetBlock: targetBlock, fulfilled: false, randomValue: 0 });
        emit RandomnessRequested(requestId, roundId, targetBlock);
    }

    /// @notice Reveals the demo random value for `requestId`. Permissionless and callable by
    ///         anyone once `targetBlock` has passed — mirrors the "fulfil demo randomness" step
    ///         a user performs from the app. INSECURE — see the security notice at the top of
    ///         this file.
    function fulfillRandomness(uint256 requestId) external {
        Request storage req = requests[requestId];
        if (req.targetBlock == 0) revert UnknownRequest(requestId);
        if (req.fulfilled) revert AlreadyFulfilled(requestId);
        if (block.number <= req.targetBlock) revert TooEarlyToFulfill(req.targetBlock);

        bytes32 hash = blockhash(req.targetBlock);
        if (hash == bytes32(0)) {
            // `targetBlock` is more than 256 blocks old, so its hash is no longer available.
            // Fall back to the previous block's hash so the testnet demo never gets stuck.
            // This is an even weaker guarantee and exists purely for demo continuity.
            hash = blockhash(block.number - 1);
        }

        uint256 randomValue = uint256(keccak256(abi.encode(hash, requestId, block.chainid, address(this))));
        req.fulfilled = true;
        req.randomValue = randomValue;

        emit RandomnessFulfilled(requestId, msg.sender, randomValue);
    }

    /// @notice Whether `requestId` has passed its delay and can be fulfilled right now.
    function readyToFulfill(uint256 requestId) external view returns (bool) {
        Request storage req = requests[requestId];
        return req.targetBlock != 0 && !req.fulfilled && block.number > req.targetBlock;
    }

    function getRequest(uint256 requestId) external view returns (Request memory) {
        return requests[requestId];
    }

    /// @inheritdoc IRandomnessProvider
    function isFulfilled(uint256 requestId) external view returns (bool) {
        return requests[requestId].fulfilled;
    }

    /// @inheritdoc IRandomnessProvider
    function getRandomness(uint256 requestId) external view returns (uint256) {
        Request storage req = requests[requestId];
        if (!req.fulfilled) revert NotFulfilled(requestId);
        return req.randomValue;
    }
}
