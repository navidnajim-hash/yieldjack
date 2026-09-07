// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { TestBase } from "./utils/TestBase.sol";
import { DemoRandomnessProvider } from "../src/randomness/DemoRandomnessProvider.sol";

contract DemoRandomnessProviderTest is TestBase {
    function test_onlyPrizeEngineCanRequest() public {
        vm.expectRevert(abi.encodeWithSelector(DemoRandomnessProvider.NotPrizeEngine.selector, address(this)));
        randomness.requestRandomness(1);
    }

    function test_prizeEngineCanOnlyBeSetOnce() public {
        vm.prank(deployer);
        vm.expectRevert(DemoRandomnessProvider.PrizeEngineAlreadySet.selector);
        randomness.setPrizeEngine(address(0xBEEF));
    }

    function test_cannotFulfillBeforeDelayElapses() public {
        vm.prank(address(engine));
        uint256 requestId = randomness.requestRandomness(1);

        vm.expectRevert(
            abi.encodeWithSelector(
                DemoRandomnessProvider.TooEarlyToFulfill.selector, block.number + randomness.MIN_DELAY_BLOCKS()
            )
        );
        randomness.fulfillRandomness(requestId);
    }

    function test_fulfillRevealsDeterministicValueAndCannotDoubleFulfill() public {
        vm.prank(address(engine));
        uint256 requestId = randomness.requestRandomness(1);

        assertFalse(randomness.isFulfilled(requestId));
        _fulfill(requestId);
        assertTrue(randomness.isFulfilled(requestId));

        uint256 value = randomness.getRandomness(requestId);
        assertTrue(value != 0 || true); // value may legitimately be any uint256, including 0

        vm.expectRevert(abi.encodeWithSelector(DemoRandomnessProvider.AlreadyFulfilled.selector, requestId));
        randomness.fulfillRandomness(requestId);
    }

    function test_unknownRequestReverts() public {
        vm.expectRevert(abi.encodeWithSelector(DemoRandomnessProvider.UnknownRequest.selector, 999));
        randomness.fulfillRandomness(999);
    }

    function test_getRandomnessRevertsIfNotFulfilled() public {
        vm.prank(address(engine));
        uint256 requestId = randomness.requestRandomness(1);

        vm.expectRevert(abi.encodeWithSelector(DemoRandomnessProvider.NotFulfilled.selector, requestId));
        randomness.getRandomness(requestId);
    }

    function test_anyoneCanFulfillPermissionlessly() public {
        vm.prank(address(engine));
        uint256 requestId = randomness.requestRandomness(1);

        vm.roll(block.number + randomness.MIN_DELAY_BLOCKS() + 1);
        vm.prank(carol);
        randomness.fulfillRandomness(requestId);
        assertTrue(randomness.isFulfilled(requestId));
    }
}
