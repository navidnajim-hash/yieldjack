// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import { JackFeeRouter } from "../src/fees/JackFeeRouter.sol";
import { JackStakingRewards } from "../src/staking/JackStakingRewards.sol";
import { IJackStakingRewards } from "../src/interfaces/IJackStakingRewards.sol";
import {
    IPonsV2LaunchFactory,
    LaunchedToken,
    LaunchConfig,
    PonsV2TokenParams,
    PonsV2Socials
} from "../src/interfaces/IPonsV2LaunchFactory.sol";
import { IWETH } from "../src/interfaces/IWETH.sol";

/// @title JackRobinhoodMainnetForkTest
/// @notice Robinhood Chain mainnet-fork integration test. Proves the verified pons V2 interfaces
///         and creator-recipient assumptions documented in docs/JACK_ARCHITECTURE.md against the
///         real, deployed V2 contracts — never a mock. Simulation only: everything here runs
///         against an ephemeral forked EVM state (`vm.createSelectFork`); nothing is ever
///         broadcast to the real network — see CLAUDE.md's absolute prohibition on that.
///
///         Skips entirely (via `vm.skip`, not a hard failure) when `ROBINHOOD_MAINNET_RPC_URL`
///         is not set. CI never sets it (see .github/workflows/ci.yml: "No secrets are
///         required... it never touches Robinhood Chain Testnet or any real RPC endpoint"), so
///         this suite only runs when a developer explicitly opts in locally, e.g.:
///           ROBINHOOD_MAINNET_RPC_URL=https://rpc.mainnet.chain.robinhood.com forge test \
///             --match-contract JackRobinhoodMainnetForkTest -vvv
///
/// @dev The launch-registration and configure-and-harvest tests below perform a REAL
///      `factory.launchToken` call against the live deployed factory to create an ephemeral
///      forked token, then credit the real fee escrow with native ETH via `vm.deal` standing in
///      for an organic trading-fee sweep (rather than reverse-engineering the bonding curve's own
///      trade calldata, which this integration does not depend on and has not source-verified
///      precisely — see docs/JACK_ARCHITECTURE.md). Both the escrow's `credit`/`claim`/
///      `balanceOf` and the factory's `launchToken`/`getLaunchedToken` are exercised as real
///      calls against real, deployed bytecode.
contract JackRobinhoodMainnetForkTest is Test {
    // Verified against live Robinhood Chain mainnet state and the official pons V2 source at
    // commit 8b9bf371030279133017b5c1b713823f5889c5d2 — see docs/JACK_ARCHITECTURE.md.
    address internal constant PONS_V2_FACTORY = 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e;
    address internal constant ROBINHOOD_WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;

    IPonsV2LaunchFactory internal factory;
    IWETH internal weth;

    address internal prizeReserve = makeAddr("prizeReserve");
    address internal operations = makeAddr("operations");
    address internal deployer = makeAddr("deployer");

    function setUp() public {
        string memory rpcUrl = vm.envOr("ROBINHOOD_MAINNET_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) {
            vm.skip(true, "ROBINHOOD_MAINNET_RPC_URL not set - fork test opt-in only, never run in CI");
            return;
        }

        vm.createSelectFork(rpcUrl);
        require(block.chainid == 4663, "fork did not land on Robinhood Chain mainnet (4663)");

        factory = IPonsV2LaunchFactory(PONS_V2_FACTORY);
        weth = IWETH(ROBINHOOD_WETH);
    }

    function test_fork_deployedContractsMatchVerifiedInterfaces() public {
        assertGt(PONS_V2_FACTORY.code.length, 0, "factory has no code");
        assertGt(address(factory.feeEscrow()).code.length, 0, "fee escrow has no code");
        assertGt(factory.memeHook().code.length, 0, "meme hook has no code");
        assertGt(ROBINHOOD_WETH.code.length, 0, "WETH has no code");

        assertEq(IERC20Metadata(ROBINHOOD_WETH).symbol(), "WETH");
        assertEq(IERC20Metadata(ROBINHOOD_WETH).decimals(), 18);
    }

    function test_fork_launchConfigMatchesDocumentedTarget() public view {
        assertGt(factory.launchConfigCount(), 0, "no launch configs");
        LaunchConfig memory config = factory.getLaunchConfig(0);
        assertTrue(config.enabled, "launch config 0 is not enabled");
        // The documented target fixed supply is 1,000,000,000 JACK (18 decimals). If this ever
        // disagrees, docs/JACK_LAUNCH_CHECKLIST.md requires stopping rather than launching
        // against a silently different supply.
        assertEq(config.supply, 1_000_000_000 ether);
    }

    /// @notice Deploys JackFeeRouter against the real factory/escrow/WETH, performs a REAL
    ///         `launchToken` call against the real, deployed pons V2 factory (creating an
    ///         ephemeral forked token — never persisted anywhere real), and confirms the
    ///         factory's own `getLaunchedToken` records the router (a contract) as
    ///         `creatorFeeRecipient` exactly as configured. Proves "creatorFeeRecipient may be a
    ///         contract" against live bytecode, not just source.
    function test_fork_realLaunchRegistersRouterAsCreatorFeeRecipient() public {
        JackFeeRouter router = _deployRouter();

        (address token,) = _launchThroughRealFactory(router);

        LaunchedToken memory launch = factory.getLaunchedToken(token);
        assertTrue(launch.exists);
        assertEq(launch.creatorFeeRecipient, address(router));
        assertEq(launch.pairToken, address(0));
    }

    /// @notice End-to-end: real launch, real staking wiring, a real `credit`/`claim` round trip
    ///         against the real deployed fee escrow, and a real `harvest()` producing the exact
    ///         70/20/10 WETH split.
    function test_fork_realLaunchConfigureAndHarvest() public {
        JackFeeRouter router = _deployRouter();
        (address token,) = _launchThroughRealFactory(router);

        JackStakingRewards staking = new JackStakingRewards(IERC20(token), weth, address(router), deployer);
        vm.prank(deployer);
        router.configureJack(token, IJackStakingRewards(address(staking)));

        uint256 feeAmount = 0.05 ether;
        vm.deal(address(this), feeAmount);
        factory.feeEscrow().credit{ value: feeAmount }(address(router));
        assertEq(factory.feeEscrow().balanceOf(address(router)), feeAmount);

        uint256 received = router.harvest();

        assertEq(received, feeAmount);
        uint256 prizePaid = weth.balanceOf(prizeReserve);
        uint256 opsPaid = weth.balanceOf(operations);
        uint256 stakerPaid = weth.balanceOf(address(staking));

        assertEq(prizePaid, (feeAmount * 2000) / 10_000);
        assertEq(opsPaid, (feeAmount * 1000) / 10_000);
        assertEq(stakerPaid + prizePaid + opsPaid, feeAmount);
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    function _deployRouter() internal returns (JackFeeRouter) {
        return
            new JackFeeRouter(factory, factory.feeEscrow(), weth, prizeReserve, operations, 7000, 2000, 1000, deployer);
    }

    function _launchThroughRealFactory(JackFeeRouter router) internal returns (address token, address curve) {
        uint256 fee = factory.launchFee();
        vm.deal(address(this), fee);

        bytes32 expectedEconomics = factory.previewLaunchEconomics(0, address(0));
        PonsV2TokenParams memory params = PonsV2TokenParams({
            name: "YieldJack Fork Test",
            symbol: "JACKFORKTEST",
            logo: "",
            description: "YieldJack Phase 1 fork-integration test launch - never broadcast, never persisted",
            socials: PonsV2Socials({ twitter: "", telegram: "", discord: "", website: "", farcaster: "" }),
            creatorFeeRecipient: address(router),
            creatorTaxBps: 0,
            buybackEnabled: false,
            expectedEconomics: expectedEconomics,
            salt: keccak256(abi.encode("yieldjack-fork-test", block.timestamp, address(this)))
        });

        (token, curve) = factory.launchToken{ value: fee }(params, 0, address(0));
    }
}
