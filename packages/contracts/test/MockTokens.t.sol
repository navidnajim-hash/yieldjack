// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { TestBase } from "./utils/TestBase.sol";
import { MockUSDG } from "../src/tokens/MockUSDG.sol";
import { MockJACK } from "../src/tokens/MockJACK.sol";

contract MockTokensTest is TestBase {
    function test_usdgDecimalsIsSix() public view {
        assertEq(usdg.decimals(), 6);
    }

    function test_jackDecimalsIsEighteen() public view {
        assertEq(jack.decimals(), 18);
    }

    function test_faucetMintsAndStartsCooldown() public {
        vm.prank(alice);
        usdg.faucet();
        assertEq(usdg.balanceOf(alice), usdg.FAUCET_AMOUNT());
    }

    function test_faucetRevertsDuringCooldown() public {
        vm.startPrank(alice);
        usdg.faucet();
        vm.expectRevert(
            abi.encodeWithSelector(MockUSDG.FaucetCooldownActive.selector, block.timestamp + usdg.FAUCET_COOLDOWN())
        );
        usdg.faucet();
        vm.stopPrank();
    }

    function test_faucetWorksAgainAfterCooldown() public {
        vm.startPrank(alice);
        usdg.faucet();
        vm.warp(block.timestamp + usdg.FAUCET_COOLDOWN());
        usdg.faucet();
        vm.stopPrank();
        assertEq(usdg.balanceOf(alice), usdg.FAUCET_AMOUNT() * 2);
    }

    function test_jackFaucetMintsAndCoolsDown() public {
        vm.startPrank(alice);
        jack.faucet();
        assertEq(jack.balanceOf(alice), jack.FAUCET_AMOUNT());
        vm.expectRevert(
            abi.encodeWithSelector(MockJACK.FaucetCooldownActive.selector, block.timestamp + jack.FAUCET_COOLDOWN())
        );
        jack.faucet();
        vm.stopPrank();
    }

    function test_onlyMinterCanMintUsdg() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(MockUSDG.NotMinter.selector, alice));
        usdg.mint(alice, 1_000e6);
    }

    function test_ownerCanGrantMinter() public {
        vm.prank(deployer);
        usdg.setMinter(alice, true);
        vm.prank(alice);
        usdg.mint(bob, 1_000e6);
        assertEq(usdg.balanceOf(bob), 1_000e6);
    }

    function test_onlyOwnerCanMintJack() public {
        vm.prank(alice);
        vm.expectRevert();
        jack.ownerMint(alice, 1 ether);

        vm.prank(deployer);
        jack.ownerMint(alice, 1 ether);
        assertEq(jack.balanceOf(alice), 1 ether);
    }
}
