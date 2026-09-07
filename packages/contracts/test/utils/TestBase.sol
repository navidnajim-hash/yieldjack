// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";

import { MockUSDG } from "../../src/tokens/MockUSDG.sol";
import { MockJACK } from "../../src/tokens/MockJACK.sol";
import { MockYieldSource } from "../../src/yield/MockYieldSource.sol";
import { DemoRandomnessProvider } from "../../src/randomness/DemoRandomnessProvider.sol";
import { YieldJackVault } from "../../src/vault/YieldJackVault.sol";
import { DemoPrizeEngine } from "../../src/prize/DemoPrizeEngine.sol";
import { SponsorRegistry } from "../../src/prize/SponsorRegistry.sol";
import { IRandomnessProvider } from "../../src/interfaces/IRandomnessProvider.sol";
import { IYieldSource } from "../../src/interfaces/IYieldSource.sol";
import { IBurnableERC20 } from "../../src/interfaces/IBurnableERC20.sol";

/// @notice Shared deployment + helpers for the YieldJack test suite. Mirrors the wiring order
///         used by script/DeployLocal.s.sol so tests exercise the same topology as the demo.
contract TestBase is Test {
    uint256 internal constant ROUND_DURATION = 1 hours;
    uint256 internal constant CLAIM_EXPIRY = 1 hours;
    uint256 internal constant DEPOSIT_CAP = 1_000_000e6;
    uint256 internal constant MIN_JACK_BURN = 100 ether;

    address internal deployer = makeAddr("deployer");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal sponsorWallet = makeAddr("sponsorWallet");

    // Public (not internal) so contracts that compose a TestBase instance by reference — e.g.
    // Invariants.t.sol's InvariantsTest reading Handler's deployment — can access them.
    MockUSDG public usdg;
    MockJACK public jack;
    MockYieldSource public yieldSource;
    DemoRandomnessProvider public randomness;
    YieldJackVault public vault;
    DemoPrizeEngine public engine;
    SponsorRegistry public sponsorRegistry;

    function setUp() public virtual {
        vm.startPrank(deployer);

        usdg = new MockUSDG(deployer);
        jack = new MockJACK(deployer);
        yieldSource = new MockYieldSource(usdg);
        usdg.setMinter(address(yieldSource), true);

        randomness = new DemoRandomnessProvider(deployer);
        vault = new YieldJackVault(IYieldSource(address(yieldSource)), DEPOSIT_CAP, deployer);
        engine = new DemoPrizeEngine(
            vault, IRandomnessProvider(address(randomness)), deployer, ROUND_DURATION, CLAIM_EXPIRY
        );
        sponsorRegistry = new SponsorRegistry(engine, usdg, IBurnableERC20(address(jack)), MIN_JACK_BURN, deployer);

        vault.setPrizeEngine(address(engine));
        randomness.setPrizeEngine(address(engine));
        engine.setSponsorRegistry(address(sponsorRegistry));

        vm.stopPrank();
    }

    /// @dev Mints `amount` mUSDG to `user` and has them approve+deposit into the vault.
    function _deposit(address user, uint256 amount) internal {
        vm.startPrank(deployer);
        usdg.mint(user, amount);
        vm.stopPrank();

        vm.startPrank(user);
        usdg.approve(address(vault), amount);
        vault.deposit(amount);
        vm.stopPrank();
    }

    function _simulateYield(uint256 amount) internal {
        yieldSource.simulateYield(amount);
    }

    /// @dev Advances time past the current round's end and closes it.
    function _closeCurrentRound() internal {
        DemoPrizeEngine.RoundSummary memory r = engine.getRound(engine.currentRoundId());
        vm.warp(uint256(r.endTime) + 1);
        engine.closeRound();
    }

    /// @dev Advances the demo randomness delay and fulfills a request.
    function _fulfill(uint256 requestId) internal {
        vm.roll(block.number + randomness.MIN_DELAY_BLOCKS() + 1);
        randomness.fulfillRandomness(requestId);
    }
}
