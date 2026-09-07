// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";

import { TestERC20 } from "./TestERC20.sol";
import { TestWETH } from "./TestWETH.sol";
import { MockPonsV2FeeEscrow } from "./MockPonsV2FeeEscrow.sol";
import { MockPonsV2Factory } from "./MockPonsV2Factory.sol";

import { JackStakingRewards } from "../../src/staking/JackStakingRewards.sol";
import { JackFeeRouter } from "../../src/fees/JackFeeRouter.sol";
import { IJackStakingRewards } from "../../src/interfaces/IJackStakingRewards.sol";
import { IPonsV2FeeEscrow } from "../../src/interfaces/IPonsV2FeeEscrow.sol";
import { IPonsV2LaunchFactory, LaunchedToken, GraduationPhase } from "../../src/interfaces/IPonsV2LaunchFactory.sol";
import { IWETH } from "../../src/interfaces/IWETH.sol";

/// @notice Shared deployment + helpers for the JackStakingRewards/JackFeeRouter test suite.
///         Wires a fully-configured router + staking pair against mock pons contracts — see
///         JackRobinhoodMainnetFork.t.sol for the real-pons-contract version.
contract JackTestBase is Test {
    uint16 internal constant STAKER_SHARE_BPS = 7000;
    uint16 internal constant PRIZE_RESERVE_SHARE_BPS = 2000;
    uint16 internal constant OPERATIONS_SHARE_BPS = 1000;

    address internal deployer = makeAddr("deployer");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal prizeReserve = makeAddr("prizeReserve");
    address internal operations = makeAddr("operations");

    TestERC20 public jack;
    TestWETH public weth;
    MockPonsV2FeeEscrow public feeEscrow;
    MockPonsV2Factory public factory;
    JackFeeRouter public router;
    JackStakingRewards public staking;

    function setUp() public virtual {
        vm.startPrank(deployer);

        jack = new TestERC20("Test JACK", "tJACK");
        weth = new TestWETH();
        feeEscrow = new MockPonsV2FeeEscrow();
        factory = new MockPonsV2Factory(IPonsV2FeeEscrow(address(feeEscrow)));

        router = new JackFeeRouter(
            IPonsV2LaunchFactory(address(factory)),
            IPonsV2FeeEscrow(address(feeEscrow)),
            IWETH(address(weth)),
            prizeReserve,
            operations,
            STAKER_SHARE_BPS,
            PRIZE_RESERVE_SHARE_BPS,
            OPERATIONS_SHARE_BPS,
            deployer
        );

        staking = new JackStakingRewards(jack, weth, address(router), deployer);

        factory.setLaunchedToken(
            address(jack),
            LaunchedToken({
                token: address(jack),
                curve: makeAddr("curve"),
                deployer: makeAddr("originalDeployer"),
                creatorFeeRecipient: address(router),
                pairToken: address(0),
                graduationThreshold: 4.2 ether,
                poolFee: 0,
                tickSpacing: 200,
                creatorTaxBps: 0,
                buybackEnabled: false,
                phase: GraduationPhase.NotGraduated,
                sweptQuote: 0,
                sweptTokens: 0,
                sweptAt: 0,
                exists: true
            })
        );

        router.configureJack(address(jack), IJackStakingRewards(address(staking)));

        vm.stopPrank();
    }

    /// @dev Mints `amount` test-JACK to `user` and has them approve+stake into `staking`.
    function _stake(address user, uint256 amount) internal {
        vm.startPrank(deployer);
        jack.mint(user, amount);
        vm.stopPrank();

        vm.startPrank(user);
        jack.approve(address(staking), amount);
        staking.stake(amount);
        vm.stopPrank();
    }

    /// @dev Credits `amount` of native ETH to the router's claimable balance in the mock fee
    ///      escrow, exactly as a real pons v2 bonding curve/hook would on a creator-fee sweep.
    function _creditFee(uint256 amount) internal {
        vm.deal(address(this), amount);
        feeEscrow.credit{ value: amount }(address(router));
    }
}
