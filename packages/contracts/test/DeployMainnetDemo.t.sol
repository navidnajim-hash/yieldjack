// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { DeployMainnetDemo } from "../script/DeployMainnetDemo.s.sol";
import { DeployBase } from "../script/DeployBase.s.sol";

/// @notice Confirms the guardrails around the MOCK-ONLY MAINNET DEMO deploy script: it only
///         runs against chain id 4663, only runs with the exact MAINNET_DEMO_ACK
///         acknowledgement, and everything it deploys is the same mock suite used on testnet —
///         never canonical USDG, never a real $JACK.
/// @dev Every value MAINNET_DEMO_ACK takes across this suite is set within a single test
///      function rather than per-test in `setUp`, deliberately: `forge test` runs test functions
///      concurrently by default, and `vm.setEnv` mutates a real, process-global OS environment
///      variable with no per-test isolation. Spreading different expected values for the same
///      env var across multiple concurrently-running test functions races. DEPLOYER_PRIVATE_KEY
///      stays in the shared `setUp` because every test wants the same value for it, which is
///      race-safe (concurrent writers always agree).
contract DeployMainnetDemoTest is Test {
    uint256 internal constant DEPLOYER_KEY = 0xA11CE;
    string internal constant VALID_ACK = "I_UNDERSTAND_THIS_IS_MOCK_ONLY";
    string internal constant WRONG_CHAIN_REVERT =
        "DeployMainnetDemo: must run against chain id 4663 (Robinhood Chain mainnet)";
    string internal constant MISSING_ACK_REVERT =
        "DeployMainnetDemo: set MAINNET_DEMO_ACK=I_UNDERSTAND_THIS_IS_MOCK_ONLY to confirm this is a worthless mock-only demo deploy";

    // The real, canonical mainnet USDG address (documented in packages/config/src/chains.ts and
    // docs/PRODUCTION_ROADMAP.md) — used here only to assert the script never produces or
    // references it, never to interact with it.
    address internal constant CANONICAL_MAINNET_USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;

    DeployMainnetDemo internal script;

    function setUp() public {
        script = new DeployMainnetDemo();
        vm.setEnv("DEPLOYER_PRIVATE_KEY", vm.toString(DEPLOYER_KEY));
    }

    function test_rejectsEveryChainExceptRobinhoodMainnet() public {
        uint256[3] memory wrongChains = [uint256(1), 46630, 31337];
        for (uint256 i = 0; i < wrongChains.length; i++) {
            vm.chainId(wrongChains[i]);
            vm.expectRevert(bytes(WRONG_CHAIN_REVERT));
            script.run();
        }
    }

    /// @dev Deliberately one test — see the contract-level @dev note on why every
    ///      MAINNET_DEMO_ACK value this suite exercises has to live in a single function.
    function test_acknowledgementGatesDeployment_thenDeploysOnlyMocks() public {
        vm.chainId(4663);

        // No acknowledgement set at all (cleared explicitly rather than assumed, so this
        // doesn't depend on the ambient shell environment when `forge test` was invoked).
        vm.setEnv("MAINNET_DEMO_ACK", "");
        vm.expectRevert(bytes(MISSING_ACK_REVERT));
        script.run();

        // Close, but not an exact match — mandatory means exact, not merely non-empty.
        vm.setEnv("MAINNET_DEMO_ACK", "i_understand_this_is_mock_only");
        vm.expectRevert(bytes(MISSING_ACK_REVERT));
        script.run();

        // Exact match: proceeds and deploys.
        vm.setEnv("MAINNET_DEMO_ACK", VALID_ACK);
        DeployBase.Deployment memory d = script.run();

        assertTrue(address(d.usdg) != address(0));
        assertTrue(address(d.jack) != address(0));
        assertTrue(address(d.yieldSource) != address(0));
        assertTrue(address(d.randomness) != address(0));
        assertTrue(address(d.vault) != address(0));
        assertTrue(address(d.engine) != address(0));
        assertTrue(address(d.sponsorRegistry) != address(0));

        // Deployer key was read from the environment, not hardcoded.
        assertEq(d.usdg.owner(), vm.addr(DEPLOYER_KEY));

        // Everything deployed is the mock suite — symbols carry the "m" prefix, never the bare
        // real symbols — and the USDG mock is never the canonical mainnet address.
        assertEq(d.usdg.symbol(), "mUSDG");
        assertEq(d.jack.symbol(), "mJACK");
        assertTrue(address(d.usdg) != CANONICAL_MAINNET_USDG);

        // Behaves like the mocks: a public per-wallet faucet a real stablecoin never would have.
        address rando = makeAddr("rando");
        vm.prank(rando);
        d.usdg.faucet();
        assertEq(d.usdg.balanceOf(rando), d.usdg.FAUCET_AMOUNT());

        address randoJack = makeAddr("randoJack");
        vm.prank(randoJack);
        d.jack.faucet();
        assertEq(d.jack.balanceOf(randoJack), d.jack.FAUCET_AMOUNT());

        // Randomness provider is the demo (explicitly insecure) implementation.
        assertGt(d.randomness.MIN_DELAY_BLOCKS(), 0);
    }
}
