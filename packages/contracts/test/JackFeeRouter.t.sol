// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { JackTestBase } from "./utils/JackTestBase.sol";
import { JackFeeRouter } from "../src/fees/JackFeeRouter.sol";
import { JackStakingRewards } from "../src/staking/JackStakingRewards.sol";
import { IJackStakingRewards } from "../src/interfaces/IJackStakingRewards.sol";
import { IPonsV2FeeEscrow } from "../src/interfaces/IPonsV2FeeEscrow.sol";
import { IPonsV2LaunchFactory, LaunchedToken, GraduationPhase } from "../src/interfaces/IPonsV2LaunchFactory.sol";
import { IWETH } from "../src/interfaces/IWETH.sol";
import { TestERC20 } from "./utils/TestERC20.sol";
import { TestWETH } from "./utils/TestWETH.sol";
import { RevertingReceiver } from "./utils/RevertingReceiver.sol";
import { MockPonsV2FeeEscrow } from "./utils/MockPonsV2FeeEscrow.sol";
import { MockPonsV2Factory } from "./utils/MockPonsV2Factory.sol";

contract JackFeeRouterTest is JackTestBase {
    // ---------------------------------------------------------------------
    // Construction
    // ---------------------------------------------------------------------

    function test_constructor_revertsOnZeroAddresses() public {
        vm.expectRevert(JackFeeRouter.ZeroAddress.selector);
        new JackFeeRouter(
            IPonsV2LaunchFactory(address(0)),
            IPonsV2FeeEscrow(address(feeEscrow)),
            IWETH(address(weth)),
            prizeReserve,
            operations,
            7000,
            2000,
            1000,
            deployer
        );

        vm.expectRevert(JackFeeRouter.ZeroAddress.selector);
        new JackFeeRouter(
            IPonsV2LaunchFactory(address(factory)),
            IPonsV2FeeEscrow(address(feeEscrow)),
            IWETH(address(weth)),
            address(0),
            operations,
            7000,
            2000,
            1000,
            deployer
        );
    }

    function test_constructor_revertsOnFeeEscrowMismatch() public {
        MockPonsV2FeeEscrow wrongEscrow = new MockPonsV2FeeEscrow();
        vm.expectRevert(
            abi.encodeWithSelector(JackFeeRouter.FeeEscrowMismatch.selector, address(feeEscrow), address(wrongEscrow))
        );
        new JackFeeRouter(
            IPonsV2LaunchFactory(address(factory)),
            IPonsV2FeeEscrow(address(wrongEscrow)),
            IWETH(address(weth)),
            prizeReserve,
            operations,
            7000,
            2000,
            1000,
            deployer
        );
    }

    function test_constructor_revertsWhenSharesDoNotSumTo10000() public {
        vm.expectRevert(abi.encodeWithSelector(JackFeeRouter.InvalidFeeShares.selector, 7000, 2000, 999));
        new JackFeeRouter(
            IPonsV2LaunchFactory(address(factory)),
            IPonsV2FeeEscrow(address(feeEscrow)),
            IWETH(address(weth)),
            prizeReserve,
            operations,
            7000,
            2000,
            999,
            deployer
        );
    }

    function test_constructor_deployableBeforeJackExists() public view {
        // JackTestBase's setUp already deploys `router` before any staking/jack wiring exists on
        // it beyond what configureJack later adds — this test documents that as an explicit,
        // named property rather than leaving it merely implicit in setUp order.
        assertEq(router.jack(), address(jack));
        assertTrue(router.configured());
    }

    // ---------------------------------------------------------------------
    // configureJack
    // ---------------------------------------------------------------------

    function test_configureJack_onlyOwner() public {
        JackFeeRouter freshRouter = _freshUnconfiguredRouter();
        vm.prank(alice);
        vm.expectRevert();
        freshRouter.configureJack(address(jack), IJackStakingRewards(address(staking)));
    }

    function test_configureJack_revertsWhenAlreadyConfigured() public {
        vm.prank(deployer);
        vm.expectRevert(JackFeeRouter.AlreadyConfigured.selector);
        router.configureJack(address(jack), IJackStakingRewards(address(staking)));
    }

    function test_configureJack_revertsWhenTokenNotLaunched() public {
        JackFeeRouter freshRouter = _freshUnconfiguredRouter();
        address notLaunched = makeAddr("notLaunched");

        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSelector(JackFeeRouter.TokenNotLaunched.selector, notLaunched));
        freshRouter.configureJack(notLaunched, IJackStakingRewards(address(staking)));
    }

    function test_configureJack_revertsWhenCreatorFeeRecipientIsNotRouter() public {
        JackFeeRouter freshRouter = _freshUnconfiguredRouter();
        address otherToken = makeAddr("otherToken");
        factory.setLaunchedToken(
            otherToken,
            LaunchedToken({
                token: otherToken,
                curve: makeAddr("curve2"),
                deployer: makeAddr("dep2"),
                creatorFeeRecipient: alice, // not the router
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

        JackStakingRewards freshStaking =
            new JackStakingRewards(IERC20(otherToken), weth, address(freshRouter), deployer);

        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSelector(JackFeeRouter.NotCreatorFeeRecipient.selector, alice));
        freshRouter.configureJack(otherToken, IJackStakingRewards(address(freshStaking)));
    }

    function test_configureJack_revertsWhenQuoteAssetIsNotNative() public {
        JackFeeRouter freshRouter = _freshUnconfiguredRouter();
        address otherToken = makeAddr("otherToken2");
        address someQuoteAsset = makeAddr("quoteAsset");
        factory.setLaunchedToken(
            otherToken,
            LaunchedToken({
                token: otherToken,
                curve: makeAddr("curve3"),
                deployer: makeAddr("dep3"),
                creatorFeeRecipient: address(freshRouter),
                pairToken: someQuoteAsset,
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
        JackStakingRewards freshStaking =
            new JackStakingRewards(IERC20(otherToken), weth, address(freshRouter), deployer);

        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSelector(JackFeeRouter.UnexpectedQuoteAsset.selector, someQuoteAsset));
        freshRouter.configureJack(otherToken, IJackStakingRewards(address(freshStaking)));
    }

    function test_configureJack_revertsOnStakingTokenMismatch() public {
        JackFeeRouter freshRouter = _freshUnconfiguredRouter();
        _registerFreshLaunch(freshRouter, address(jack));

        TestERC20 wrongToken = new TestERC20("Wrong", "WRONG");
        JackStakingRewards mismatchedStaking = new JackStakingRewards(wrongToken, weth, address(freshRouter), deployer);

        vm.prank(deployer);
        vm.expectRevert(
            abi.encodeWithSelector(JackFeeRouter.StakingTokenMismatch.selector, address(jack), address(wrongToken))
        );
        freshRouter.configureJack(address(jack), IJackStakingRewards(address(mismatchedStaking)));
    }

    function test_configureJack_revertsOnRewardTokenMismatch() public {
        JackFeeRouter freshRouter = _freshUnconfiguredRouter();
        _registerFreshLaunch(freshRouter, address(jack));

        TestWETH wrongWeth = new TestWETH();
        JackStakingRewards mismatchedStaking = new JackStakingRewards(jack, wrongWeth, address(freshRouter), deployer);

        vm.prank(deployer);
        vm.expectRevert(
            abi.encodeWithSelector(JackFeeRouter.RewardTokenMismatch.selector, address(weth), address(wrongWeth))
        );
        freshRouter.configureJack(address(jack), IJackStakingRewards(address(mismatchedStaking)));
    }

    function test_configureJack_success() public {
        JackFeeRouter freshRouter = _freshUnconfiguredRouter();
        _registerFreshLaunch(freshRouter, address(jack));
        JackStakingRewards freshStaking = new JackStakingRewards(jack, weth, address(freshRouter), deployer);

        vm.prank(deployer);
        freshRouter.configureJack(address(jack), IJackStakingRewards(address(freshStaking)));

        assertEq(freshRouter.jack(), address(jack));
        assertEq(address(freshRouter.staking()), address(freshStaking));
        assertTrue(freshRouter.configured());
    }

    // ---------------------------------------------------------------------
    // harvest
    // ---------------------------------------------------------------------

    function test_harvest_revertsWhenNotConfigured() public {
        JackFeeRouter freshRouter = _freshUnconfiguredRouter();
        vm.expectRevert(JackFeeRouter.NotConfigured.selector);
        freshRouter.harvest();
    }

    function test_harvest_noOpWhenNothingClaimable() public {
        uint256 received = router.harvest();
        assertEq(received, 0);
    }

    function test_harvest_exact70_20_10split() public {
        _stake(alice, 100 ether);
        _creditFee(10 ether);

        uint256 received = router.harvest();

        assertEq(received, 10 ether);
        assertEq(weth.balanceOf(prizeReserve), 2 ether);
        assertEq(weth.balanceOf(operations), 1 ether);
        assertEq(weth.balanceOf(address(staking)), 7 ether);
        assertApproxEqAbs(staking.getRewardForDuration(), 7 ether, 7 days);
    }

    function test_harvest_measuresActualEthReceivedOnShortfall() public {
        _stake(alice, 100 ether);
        _creditFee(10 ether);
        feeEscrow.setShortfall(1 ether);

        uint256 received = router.harvest();

        assertEq(received, 9 ether);
        assertEq(weth.balanceOf(prizeReserve) + weth.balanceOf(operations) + weth.balanceOf(address(staking)), 9 ether);
        // The un-received 1 ether must never be double counted into any split.
        assertEq(weth.balanceOf(prizeReserve), (9 ether * 2000) / 10_000);
    }

    function test_harvest_isPermissionless() public {
        _stake(alice, 100 ether);
        _creditFee(1 ether);

        vm.prank(bob);
        uint256 received = router.harvest();
        assertEq(received, 1 ether);
    }

    function test_harvest_zeroStakers_stillTransfersAndQueuesStakerShare() public {
        _creditFee(10 ether);
        router.harvest();

        assertEq(weth.balanceOf(address(staking)), 7 ether);
        assertEq(staking.queuedRewards(), 7 ether);
        assertEq(staking.rewardRate(), 0);
    }

    function test_harvest_multipleHarvestsDuringActiveStream() public {
        _stake(alice, 100 ether);
        _creditFee(7 ether);
        router.harvest();

        vm.warp(block.timestamp + 3.5 days);
        _creditFee(7 ether);
        router.harvest();

        assertEq(weth.balanceOf(address(staking)), 9.8 ether); // 70% of 14 ether total

        vm.warp(block.timestamp + 7 days);
        // Two notify() calls each contribute up to just under `DURATION` wei of floor-rounding
        // dust to rewardRate, so the tolerance scales with the number of notifications.
        assertApproxEqAbs(staking.earned(alice), 9.8 ether, 2 * 7 days);
    }

    function test_harvest_succeedsWithRevertingRecipients() public {
        RevertingReceiver badPrizeReserve = new RevertingReceiver();
        JackFeeRouter freshRouter = new JackFeeRouter(
            IPonsV2LaunchFactory(address(factory)),
            IPonsV2FeeEscrow(address(feeEscrow)),
            IWETH(address(weth)),
            address(badPrizeReserve),
            operations,
            7000,
            2000,
            1000,
            deployer
        );
        _registerFreshLaunch(freshRouter, address(jack));
        JackStakingRewards freshStaking = new JackStakingRewards(jack, weth, address(freshRouter), deployer);
        vm.prank(deployer);
        freshRouter.configureJack(address(jack), IJackStakingRewards(address(freshStaking)));

        vm.deal(address(this), 10 ether);
        feeEscrow.credit{ value: 10 ether }(address(freshRouter));

        uint256 received = freshRouter.harvest();

        assertEq(received, 10 ether);
        assertEq(weth.balanceOf(address(badPrizeReserve)), 2 ether);
    }

    function testFuzz_harvest_splitsAlwaysSumToReceivedExactly(uint256 feeAmount) public {
        feeAmount = bound(feeAmount, 1, 100_000 ether);
        _stake(alice, 100 ether);
        _creditFee(feeAmount);

        uint256 received = router.harvest();

        uint256 stakerShare = weth.balanceOf(address(staking));
        uint256 prizeShare = weth.balanceOf(prizeReserve);
        uint256 opsShare = weth.balanceOf(operations);

        assertEq(received, feeAmount);
        assertEq(stakerShare + prizeShare + opsShare, received);
        // No individual share can be off by more than one basis point's worth of rounding.
        assertApproxEqAbs(stakerShare, (feeAmount * 7000) / 10_000, 1);
        assertApproxEqAbs(prizeShare, (feeAmount * 2000) / 10_000, 1);
    }

    // ---------------------------------------------------------------------
    // Recipient configuration
    // ---------------------------------------------------------------------

    function test_setPrizeReserveRecipient_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        router.setPrizeReserveRecipient(bob);
    }

    function test_setPrizeReserveRecipient_revertsOnZeroAddress() public {
        vm.prank(deployer);
        vm.expectRevert(JackFeeRouter.ZeroAddress.selector);
        router.setPrizeReserveRecipient(address(0));
    }

    function test_setPrizeReserveRecipient_updatesAndEmits() public {
        vm.prank(deployer);
        vm.expectEmit(true, true, false, false);
        emit JackFeeRouter.PrizeReserveRecipientUpdated(prizeReserve, bob);
        router.setPrizeReserveRecipient(bob);
        assertEq(router.prizeReserveRecipient(), bob);
    }

    function test_setOperationsRecipient_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        router.setOperationsRecipient(bob);
    }

    // ---------------------------------------------------------------------
    // Staking migration timelock
    // ---------------------------------------------------------------------

    function test_proposeStakingMigration_onlyOwner() public {
        JackStakingRewards newStaking = new JackStakingRewards(jack, weth, address(router), deployer);
        vm.prank(alice);
        vm.expectRevert();
        router.proposeStakingMigration(IJackStakingRewards(address(newStaking)));
    }

    function test_proposeStakingMigration_revertsOnStakingTokenMismatch() public {
        TestERC20 wrongToken = new TestERC20("Wrong", "WRONG");
        JackStakingRewards newStaking = new JackStakingRewards(wrongToken, weth, address(router), deployer);

        vm.prank(deployer);
        vm.expectRevert(
            abi.encodeWithSelector(JackFeeRouter.StakingTokenMismatch.selector, address(jack), address(wrongToken))
        );
        router.proposeStakingMigration(IJackStakingRewards(address(newStaking)));
    }

    function test_executeStakingMigration_revertsBeforeTimelockElapses() public {
        JackStakingRewards newStaking = new JackStakingRewards(jack, weth, address(router), deployer);
        vm.prank(deployer);
        router.proposeStakingMigration(IJackStakingRewards(address(newStaking)));

        // Read before pranking: vm.prank applies only to the very next call, and chaining a
        // getter into the same statement as the guarded call would silently consume it instead.
        uint256 effectiveAt = router.stakingMigrationEffectiveAt();
        vm.warp(block.timestamp + 7 days - 1);

        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSelector(JackFeeRouter.TimelockNotElapsed.selector, effectiveAt));
        router.executeStakingMigration();
    }

    function test_executeStakingMigration_succeedsAfterTimelock() public {
        JackStakingRewards newStaking = new JackStakingRewards(jack, weth, address(router), deployer);
        vm.prank(deployer);
        router.proposeStakingMigration(IJackStakingRewards(address(newStaking)));

        vm.warp(block.timestamp + 7 days);
        vm.prank(deployer);
        router.executeStakingMigration();

        assertEq(address(router.staking()), address(newStaking));
        assertEq(router.pendingStaking(), address(0));
    }

    function test_executeStakingMigration_revertsWithNoPendingProposal() public {
        vm.prank(deployer);
        vm.expectRevert(JackFeeRouter.NoPendingMigration.selector);
        router.executeStakingMigration();
    }

    function test_cancelStakingMigration_clearsProposal() public {
        JackStakingRewards newStaking = new JackStakingRewards(jack, weth, address(router), deployer);
        vm.prank(deployer);
        router.proposeStakingMigration(IJackStakingRewards(address(newStaking)));

        vm.prank(deployer);
        router.cancelStakingMigration();

        assertEq(router.pendingStaking(), address(0));

        vm.warp(block.timestamp + 7 days);
        vm.prank(deployer);
        vm.expectRevert(JackFeeRouter.NoPendingMigration.selector);
        router.executeStakingMigration();
    }

    function test_executeStakingMigration_onlyOwner() public {
        JackStakingRewards newStaking = new JackStakingRewards(jack, weth, address(router), deployer);
        vm.prank(deployer);
        router.proposeStakingMigration(IJackStakingRewards(address(newStaking)));
        vm.warp(block.timestamp + 7 days);

        vm.prank(alice);
        vm.expectRevert();
        router.executeStakingMigration();
    }

    // ---------------------------------------------------------------------
    // Rescue
    // ---------------------------------------------------------------------

    function test_rescue_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        router.rescue(weth, alice, 1);
    }

    function test_rescue_revertsForWeth() public {
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSelector(JackFeeRouter.CannotRescueProtocolToken.selector, address(weth)));
        router.rescue(weth, deployer, 1);
    }

    function test_rescue_worksForUnrelatedToken() public {
        TestERC20 randomToken = new TestERC20("Random", "RND");
        randomToken.mint(address(router), 500 ether);

        vm.prank(deployer);
        router.rescue(randomToken, deployer, 500 ether);

        assertEq(randomToken.balanceOf(deployer), 500 ether);
    }

    // ---------------------------------------------------------------------
    // receive()
    // ---------------------------------------------------------------------

    function test_receive_revertsForUnexpectedSender() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(JackFeeRouter.UnexpectedEther.selector, alice));
        (bool ok,) = address(router).call{ value: 1 ether }("");
        ok; // silence unused-var warning; the revert is what's asserted above
    }

    function test_receive_acceptsFromFeeEscrow() public {
        _creditFee(1 ether);
        // feeEscrow paying the router during harvest() is exactly this path; a successful
        // harvest (see test_harvest_exact70_20_10split) already proves it works end to end.
        assertEq(feeEscrow.balanceOf(address(router)), 1 ether);
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    function _freshUnconfiguredRouter() internal returns (JackFeeRouter) {
        return new JackFeeRouter(
            IPonsV2LaunchFactory(address(factory)),
            IPonsV2FeeEscrow(address(feeEscrow)),
            IWETH(address(weth)),
            prizeReserve,
            operations,
            7000,
            2000,
            1000,
            deployer
        );
    }

    function _registerFreshLaunch(JackFeeRouter targetRouter, address token) internal {
        factory.setLaunchedToken(
            token,
            LaunchedToken({
                token: token,
                curve: makeAddr("freshCurve"),
                deployer: makeAddr("freshDeployer"),
                creatorFeeRecipient: address(targetRouter),
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
    }
}
