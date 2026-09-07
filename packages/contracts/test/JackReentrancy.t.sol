// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { JackStakingRewards } from "../src/staking/JackStakingRewards.sol";
import { JackFeeRouter } from "../src/fees/JackFeeRouter.sol";
import { IJackStakingRewards } from "../src/interfaces/IJackStakingRewards.sol";
import { IPonsV2FeeEscrow } from "../src/interfaces/IPonsV2FeeEscrow.sol";
import { IPonsV2LaunchFactory, LaunchedToken, GraduationPhase } from "../src/interfaces/IPonsV2LaunchFactory.sol";
import { IWETH } from "../src/interfaces/IWETH.sol";

import { MaliciousReentrantToken, IAttacker } from "./utils/MaliciousReentrantToken.sol";
import { MaliciousReentrantWETH, IWETHAttacker } from "./utils/MaliciousReentrantWETH.sol";
import { TestWETH } from "./utils/TestWETH.sol";
import { MockPonsV2Factory } from "./utils/MockPonsV2Factory.sol";

/// @notice Re-enters `withdraw` when the malicious staking token calls back mid-`transfer`, to
///         prove JackStakingRewards.withdraw's `nonReentrant` guard holds.
contract StakingWithdrawAttacker is IAttacker {
    JackStakingRewards public immutable staking;
    bool public reentered;

    constructor(JackStakingRewards staking_) {
        staking = staking_;
    }

    function depositInto(IERC20 token, uint256 amount) external {
        token.approve(address(staking), amount);
        staking.stake(amount);
    }

    function attack(uint256 amount) external {
        staking.withdraw(amount);
    }

    function reenter() external {
        if (reentered) return;
        reentered = true;
        staking.withdraw(1);
    }
}

/// @notice Re-enters `claimReward` when the malicious reward token calls back mid-`transfer`, to
///         prove JackStakingRewards.claimReward's `nonReentrant` guard holds.
contract StakingClaimAttacker is IWETHAttacker {
    JackStakingRewards public immutable staking;
    bool public reentered;

    constructor(JackStakingRewards staking_) {
        staking = staking_;
    }

    function reenter() external {
        if (reentered) return;
        reentered = true;
        staking.claimReward();
    }
}

/// @notice Minimal malicious fee escrow that re-enters `JackFeeRouter.harvest` mid-`claim`, to
///         prove `harvest`'s `nonReentrant` guard holds even against a hostile escrow.
contract MaliciousReentrantFeeEscrow is IPonsV2FeeEscrow {
    mapping(address => uint256) private _balances;
    JackFeeRouter public target;
    bool public armed;

    function setTarget(JackFeeRouter target_) external {
        target = target_;
    }

    function arm() external {
        armed = true;
    }

    function credit(address recipient) external payable override {
        _balances[recipient] += msg.value;
    }

    function creditToken(address, address, uint256) external pure override {
        revert("not supported");
    }

    function claim() external override returns (uint256) {
        return _claim(_balances[msg.sender]);
    }

    function claim(uint256 amount) external override returns (uint256) {
        return _claim(amount);
    }

    function claimToken(address) external pure override returns (uint256) {
        revert("not supported");
    }

    function claimToken(address, uint256) external pure override returns (uint256) {
        revert("not supported");
    }

    function balanceOf(address recipient) external view override returns (uint256) {
        return _balances[recipient];
    }

    function balanceOfToken(address, address) external pure override returns (uint256) {
        return 0;
    }

    function _claim(uint256 amount) private returns (uint256) {
        _balances[msg.sender] -= amount;
        if (armed) {
            armed = false;
            target.harvest();
        }
        (bool ok,) = msg.sender.call{ value: amount }("");
        require(ok, "send failed");
        return amount;
    }
}

contract JackReentrancyTest is Test {
    function test_stakingWithdraw_reentrancyReverts() public {
        MaliciousReentrantToken evilJack = new MaliciousReentrantToken();
        TestWETH weth = new TestWETH();
        JackStakingRewards staking = new JackStakingRewards(evilJack, weth, address(this), address(this));
        StakingWithdrawAttacker attacker = new StakingWithdrawAttacker(staking);

        evilJack.mint(address(attacker), 100e6);
        evilJack.arm(address(attacker));

        vm.prank(address(attacker));
        attacker.depositInto(evilJack, 100e6);

        vm.prank(address(attacker));
        vm.expectRevert();
        attacker.attack(50e6);

        assertEq(staking.balanceOf(address(attacker)), 100e6);
        assertEq(evilJack.balanceOf(address(attacker)), 0);
    }

    function test_stakingClaimReward_reentrancyReverts() public {
        TestWETH stakeToken = new TestWETH(); // any plain ERC20 works as the stake side here
        MaliciousReentrantWETH evilWeth = new MaliciousReentrantWETH();
        JackStakingRewards staking = new JackStakingRewards(stakeToken, evilWeth, address(this), address(this));
        StakingClaimAttacker attacker = new StakingClaimAttacker(staking);

        vm.deal(address(attacker), 10 ether);
        vm.prank(address(attacker));
        stakeToken.deposit{ value: 10 ether }();
        vm.startPrank(address(attacker));
        stakeToken.approve(address(staking), 10 ether);
        staking.stake(10 ether);
        vm.stopPrank();

        evilWeth.deposit{ value: 7 ether }();
        evilWeth.transfer(address(staking), 7 ether);
        staking.notifyRewardAmount(7 ether);

        vm.warp(block.timestamp + 7 days);
        evilWeth.arm(address(attacker));

        vm.prank(address(attacker));
        vm.expectRevert();
        staking.claimReward();
    }

    function test_feeRouterHarvest_reentrancyReverts() public {
        MaliciousReentrantFeeEscrow evilEscrow = new MaliciousReentrantFeeEscrow();
        TestWETH weth = new TestWETH();
        MockPonsV2Factory factory = new MockPonsV2Factory(IPonsV2FeeEscrow(address(evilEscrow)));

        JackFeeRouter router = new JackFeeRouter(
            IPonsV2LaunchFactory(address(factory)),
            IPonsV2FeeEscrow(address(evilEscrow)),
            IWETH(address(weth)),
            makeAddr("prize"),
            makeAddr("ops"),
            7000,
            2000,
            1000,
            address(this)
        );
        evilEscrow.setTarget(router);

        TestWETH jack = new TestWETH(); // stand-in for JACK, unused beyond satisfying types
        factory.setLaunchedToken(
            address(jack),
            LaunchedToken({
                token: address(jack),
                curve: makeAddr("curve"),
                deployer: makeAddr("dep"),
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
        JackStakingRewards staking = new JackStakingRewards(jack, weth, address(router), address(this));
        router.configureJack(address(jack), IJackStakingRewards(address(staking)));

        vm.deal(address(this), 10 ether);
        evilEscrow.credit{ value: 10 ether }(address(router));
        evilEscrow.arm();

        // The reentrant inner harvest() call reverts (nonReentrant), which reverts the escrow's
        // claim(), which reverts the whole outer harvest() — no funds move.
        vm.expectRevert();
        router.harvest();

        assertEq(weth.balanceOf(address(staking)), 0);
        assertEq(evilEscrow.balanceOf(address(router)), 10 ether);
    }
}
