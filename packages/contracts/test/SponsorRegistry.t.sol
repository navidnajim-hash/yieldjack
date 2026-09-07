// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { TestBase } from "./utils/TestBase.sol";
import { SponsorRegistry } from "../src/prize/SponsorRegistry.sol";
import { DemoPrizeEngine } from "../src/prize/DemoPrizeEngine.sol";

contract SponsorRegistryTest is TestBase {
    function _fundSponsor(uint256 usdgAmount, uint256 jackAmount) internal {
        vm.startPrank(deployer);
        usdg.mint(sponsorWallet, usdgAmount);
        jack.ownerMint(sponsorWallet, jackAmount);
        vm.stopPrank();

        vm.startPrank(sponsorWallet);
        usdg.approve(address(sponsorRegistry), usdgAmount);
        jack.approve(address(sponsorRegistry), jackAmount);
        vm.stopPrank();
    }

    function test_sponsorTargetsCurrentRound() public {
        assertEq(sponsorRegistry.currentTargetRound(), engine.currentRoundId());
    }

    function test_zeroUsdgAmountReverts() public {
        _fundSponsor(0, 200 ether);
        vm.prank(sponsorWallet);
        vm.expectRevert(SponsorRegistry.ZeroAmount.selector);
        sponsorRegistry.sponsor(0, 200 ether, "");
    }

    function test_metadataTooLongReverts() public {
        _fundSponsor(100e6, 200 ether);
        bytes memory longMeta = new bytes(sponsorRegistry.MAX_METADATA_LENGTH() + 1);
        vm.prank(sponsorWallet);
        vm.expectRevert(
            abi.encodeWithSelector(
                SponsorRegistry.MetadataTooLong.selector, longMeta.length, sponsorRegistry.MAX_METADATA_LENGTH()
            )
        );
        sponsorRegistry.sponsor(100e6, 200 ether, string(longMeta));
    }

    function test_sponsorRequiresApprovals() public {
        vm.startPrank(deployer);
        usdg.mint(sponsorWallet, 100e6);
        jack.ownerMint(sponsorWallet, 200 ether);
        vm.stopPrank();

        vm.prank(sponsorWallet);
        vm.expectRevert();
        sponsorRegistry.sponsor(100e6, 200 ether, "no approvals given");
    }

    function test_multipleSponsorsAccumulate() public {
        _fundSponsor(100e6, 200 ether);
        vm.prank(sponsorWallet);
        sponsorRegistry.sponsor(100e6, 200 ether, "first");

        address secondSponsor = makeAddr("secondSponsor");
        vm.startPrank(deployer);
        usdg.mint(secondSponsor, 50e6);
        jack.ownerMint(secondSponsor, 200 ether);
        vm.stopPrank();
        vm.startPrank(secondSponsor);
        usdg.approve(address(sponsorRegistry), 50e6);
        jack.approve(address(sponsorRegistry), 200 ether);
        sponsorRegistry.sponsor(50e6, 200 ether, "second");
        vm.stopPrank();

        DemoPrizeEngine.RoundSummary memory round = engine.getRound(engine.currentRoundId());
        assertEq(round.sponsorAmount, 150e6);
        assertEq(round.sponsorCount, 2);
        assertEq(round.sponsorJackBurned, 400 ether);
        assertEq(round.prizeAmount, 150e6);
    }
}
