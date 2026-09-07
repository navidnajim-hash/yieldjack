// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { console2 } from "forge-std/Script.sol";
import { DeployBase } from "./DeployBase.s.sol";

/// @notice Deploys the exact same YieldJack testnet-MVP contract suite — unchanged — to
///         Robinhood Chain mainnet (chain id 4663) as an explicitly labelled, worthless
///         MOCK-ONLY MAINNET DEMO. This is NOT a production deployment and NOT authorization to
///         use real USDG, a real yield integration, or a real $JACK token: it deploys MockUSDG,
///         MockJACK, MockYieldSource, and DemoRandomnessProvider, the same mocks DeployTestnet
///         uses, with no code changes. Nothing this script deploys should ever be described as
///         production-ready, and no real assets should ever be sent to any address it deploys.
///
///         Guarded three ways against accidental or casual use:
///           1. Refuses to run against any chain id other than 4663.
///           2. Requires the operator to set `MAINNET_DEMO_ACK` to an exact acknowledgement
///              string before proceeding — see `REQUIRED_ACK`.
///           3. Reads `DEPLOYER_PRIVATE_KEY` from the environment only at the point of an
///              eventual local `forge script ... --broadcast` run, exactly like DeployTestnet —
///              never hardcoded, never logged, and no automation in this repository supplies or
///              broadcasts it.
///
///         See CLAUDE.md for the narrow carve-out that permits this one script to exist, and
///         docs/PRODUCTION_ROADMAP.md for everything a real, value-bearing deployment would
///         still need (none of which this script attempts).
contract DeployMainnetDemo is DeployBase {
    /// @notice The exact value MAINNET_DEMO_ACK must equal for this script to proceed.
    string internal constant REQUIRED_ACK = "I_UNDERSTAND_THIS_IS_MOCK_ONLY";

    function run() external returns (Deployment memory d) {
        require(block.chainid == 4663, "DeployMainnetDemo: must run against chain id 4663 (Robinhood Chain mainnet)");

        string memory ack = vm.envOr("MAINNET_DEMO_ACK", string(""));
        require(
            keccak256(bytes(ack)) == keccak256(bytes(REQUIRED_ACK)),
            "DeployMainnetDemo: set MAINNET_DEMO_ACK=I_UNDERSTAND_THIS_IS_MOCK_ONLY to confirm this is a worthless mock-only demo deploy"
        );

        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        uint256 depositCap = vm.envOr("DEPOSIT_CAP", uint256(1_000_000e6));
        uint256 roundDuration = vm.envOr("ROUND_DURATION_SECONDS", uint256(2 hours));
        uint256 claimExpiry = vm.envOr("CLAIM_EXPIRY_SECONDS", uint256(6 hours));

        vm.startBroadcast(deployerKey);
        d = _deployAndWire(deployer, depositCap, roundDuration, claimExpiry);
        vm.stopBroadcast();

        _logDeployment(d);
        console2.log("MOCK-ONLY MAINNET DEMO: no real USDG, no real JACK, no real value.");
    }
}
