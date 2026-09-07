// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Script, console2 } from "forge-std/Script.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { JackFeeRouter } from "../src/fees/JackFeeRouter.sol";
import { JackStakingRewards } from "../src/staking/JackStakingRewards.sol";
import { IJackStakingRewards } from "../src/interfaces/IJackStakingRewards.sol";
import { IPonsV2FeeEscrow } from "../src/interfaces/IPonsV2FeeEscrow.sol";
import {
    IPonsV2LaunchFactory,
    LaunchedToken,
    PonsV2TokenParams,
    PonsV2Socials
} from "../src/interfaces/IPonsV2LaunchFactory.sol";
import { IWETH } from "../src/interfaces/IWETH.sol";

/// @title SimulateJackLifecycle
/// @notice Fork-only lifecycle simulation: deploys JackFeeRouter and JackStakingRewards, performs
///         a real `launchToken` call against the live, deployed pons V2 factory to create an
///         ephemeral token, wires everything together, credits a simulated creator-fee sweep,
///         harvests it, stakes, and claims — narrating every step. Purely a local dry run: run it
///         with `--rpc-url` and WITHOUT `--broadcast` (this script never calls
///         `vm.startBroadcast`, so nothing here could be broadcast even if that flag were added
///         by mistake). Nothing it deploys or launches is ever persisted anywhere real.
///
///           forge script script/SimulateJackLifecycle.s.sol \
///             --rpc-url $ROBINHOOD_MAINNET_RPC_URL -vvvv
///
///         See CLAUDE.md's absolute prohibition on any real-value mainnet deployment or
///         transaction — this script performs neither; it is a read/simulate-only exploration
///         tool, exactly like `forge test`'s own fork tests (see
///         test/JackRobinhoodMainnetFork.t.sol, which asserts the same flow's outcomes).
///
/// @dev Split into small `_stepN` functions, each touching contract-level state instead of one
///      function with many locals, purely to stay under the EVM's stack-depth limit at
///      `via_ir = false` (this project's standard profile — see foundry.toml) rather than for any
///      narrative reason.
contract SimulateJackLifecycle is Script {
    // Verified against live Robinhood Chain mainnet state and the official pons V2 source at
    // commit 8b9bf371030279133017b5c1b713823f5889c5d2 — see docs/JACK_ARCHITECTURE.md.
    address internal constant PONS_V2_FACTORY = 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e;
    address internal constant ROBINHOOD_WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;

    uint16 internal constant STAKER_SHARE_BPS = 7000;
    uint16 internal constant PRIZE_RESERVE_SHARE_BPS = 2000;
    uint16 internal constant OPERATIONS_SHARE_BPS = 1000;

    IPonsV2LaunchFactory internal factory;
    IWETH internal weth;

    address internal prizeReserve;
    address internal operations;
    address internal deployer;
    address internal staker;
    address internal simulator;

    JackFeeRouter internal router;
    JackStakingRewards internal staking;
    address internal token;
    address internal curve;

    function run() external {
        require(
            block.chainid == 4663, "SimulateJackLifecycle: must run against chain id 4663 (Robinhood Chain mainnet)"
        );
        require(PONS_V2_FACTORY.code.length > 0, "SimulateJackLifecycle: factory has no deployed bytecode");

        factory = IPonsV2LaunchFactory(PONS_V2_FACTORY);
        weth = IWETH(ROBINHOOD_WETH);
        prizeReserve = makeAddr("simulated-prize-reserve");
        operations = makeAddr("simulated-operations");
        deployer = makeAddr("simulated-deployer");
        staker = makeAddr("simulated-staker");
        // Foundry's script sanitizer refuses `address(this)` in a Script contract (its own
        // address is ephemeral and never what actually pays gas under `--broadcast`), so every
        // value-carrying call below runs as this dedicated, funded simulated address instead.
        simulator = makeAddr("simulated-caller");

        _step1_deployRouter();
        _step2_launchThroughRealFactory();
        _step3_deployStakingAndConfigure();
        _step4_simulateFeeSweep();
        _step5_harvestBeforeAnyoneStaked();
        _step6_stakerArrivesAndStartsStream();
        _step7_warpAndClaim();
        _printSummary();
    }

    function _step1_deployRouter() private {
        console2.log("=== Step 1: deploy JackFeeRouter (before JACK exists) ===");
        router = new JackFeeRouter(
            factory,
            factory.feeEscrow(),
            weth,
            prizeReserve,
            operations,
            STAKER_SHARE_BPS,
            PRIZE_RESERVE_SHARE_BPS,
            OPERATIONS_SHARE_BPS,
            deployer
        );
        console2.log("router deployed at     ", address(router));
    }

    function _step2_launchThroughRealFactory() private {
        console2.log("");
        console2.log("=== Step 2: launch a token through the real pons V2 factory ===");
        bytes32 expectedEconomics = factory.previewLaunchEconomics(0, address(0));
        console2.log("expectedEconomics digest (read fresh, right before launching):");
        console2.logBytes32(expectedEconomics);

        uint256 fee = factory.launchFee();
        vm.deal(simulator, fee);
        PonsV2TokenParams memory params = PonsV2TokenParams({
            name: "YieldJack Lifecycle Simulation",
            symbol: "JACKSIM",
            logo: "",
            description: "YieldJack Phase 1 fork-only lifecycle simulation - never broadcast, never persisted",
            socials: PonsV2Socials({ twitter: "", telegram: "", discord: "", website: "", farcaster: "" }),
            creatorFeeRecipient: address(router),
            creatorTaxBps: 0,
            buybackEnabled: false,
            expectedEconomics: expectedEconomics,
            salt: keccak256(abi.encode("yieldjack-lifecycle-sim", block.timestamp))
        });
        vm.prank(simulator);
        (token, curve) = factory.launchToken{ value: fee }(params, 0, address(0));
        console2.log("simulated JACK token   ", token);
        console2.log("bonding curve          ", curve);

        LaunchedToken memory launch = factory.getLaunchedToken(token);
        console2.log("creatorFeeRecipient == router?", launch.creatorFeeRecipient == address(router));
    }

    function _step3_deployStakingAndConfigure() private {
        console2.log("");
        console2.log("=== Step 3: deploy JackStakingRewards and configure the router ===");
        staking = new JackStakingRewards(IERC20(token), weth, address(router), deployer);
        vm.prank(deployer);
        router.configureJack(token, IJackStakingRewards(address(staking)));
        console2.log("staking deployed at    ", address(staking));
        console2.log("router.configured      ", router.configured());
    }

    function _step4_simulateFeeSweep() private {
        console2.log("");
        console2.log("=== Step 4: simulate a creator-fee sweep landing in the escrow ===");
        uint256 simulatedFee = 0.05 ether;
        vm.deal(simulator, simulatedFee);
        // Resolve the escrow before pranking: vm.prank applies only to the very next call, and
        // factory.feeEscrow() is itself a call — chaining it straight into `.credit(...)` would
        // silently consume the prank on that getter instead.
        IPonsV2FeeEscrow escrow = factory.feeEscrow();
        vm.prank(simulator);
        escrow.credit{ value: simulatedFee }(address(router));
        console2.log("router claimable balance", factory.feeEscrow().balanceOf(address(router)));
    }

    function _step5_harvestBeforeAnyoneStaked() private {
        console2.log("");
        console2.log("=== Step 5: harvest (before anyone is staked - staker share queues) ===");
        uint256 received = router.harvest();
        console2.log("harvested (wei)        ", received);
        console2.log("staking.queuedRewards  ", staking.queuedRewards());
        console2.log("staking.rewardRate     ", staking.rewardRate());
    }

    function _step6_stakerArrivesAndStartsStream() private {
        console2.log("");
        console2.log("=== Step 6: a staker arrives, starting the queued stream ===");
        // This simulation does not reverse-engineer the bonding curve's own trade calldata (see
        // docs/JACK_ARCHITECTURE.md for why). The curve holds the token's entire minted supply
        // from launch (confirmed from pons V2 source - PonsV2LauncherToken mints its full supply
        // to the curve), so impersonating it to move a slice to the staker directly is grounded
        // in real, launch-time contract state rather than a magic balance cheat.
        uint256 stakeAmount = 1000 ether;
        vm.prank(curve);
        IERC20(token).transfer(staker, stakeAmount);

        vm.startPrank(staker);
        IERC20(token).approve(address(staking), stakeAmount);
        staking.stake(stakeAmount);
        vm.stopPrank();

        console2.log("staker staked (wei)    ", stakeAmount);
        console2.log("staking.rewardRate     ", staking.rewardRate());
        console2.log("staking.periodFinish   ", staking.periodFinish());
    }

    function _step7_warpAndClaim() private {
        console2.log("");
        console2.log("=== Step 7: warp forward and claim ===");
        vm.warp(block.timestamp + 7 days);
        console2.log("staker earned (wei)    ", staking.earned(staker));
        vm.prank(staker);
        staking.claimReward();
        console2.log("staker WETH balance    ", weth.balanceOf(staker));
    }

    function _printSummary() private view {
        console2.log("");
        console2.log("=== Summary ===");
        console2.log("prize reserve WETH     ", weth.balanceOf(prizeReserve));
        console2.log("operations WETH        ", weth.balanceOf(operations));
        console2.log("Simulation complete - nothing above was broadcast.");
    }
}
