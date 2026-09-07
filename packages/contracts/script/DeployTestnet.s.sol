// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {DeployBase} from "./DeployBase.s.sol";

/// @notice Deploys the full YieldJack testnet-MVP contract suite to Robinhood Chain Testnet
///         (chain id 46630). Requires DEPLOYER_PRIVATE_KEY in the environment — there is no
///         fallback key, and this script refuses to run against any other chain id. There is
///         deliberately no mainnet equivalent of this script; see CLAUDE.md.
contract DeployTestnet is DeployBase {
    function run() external {
        require(block.chainid == 46630, "DeployTestnet: must run against chain id 46630 (Robinhood Chain Testnet)");

        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        uint256 depositCap = vm.envOr("DEPOSIT_CAP", uint256(1_000_000e6));
        // Shortened from the 7-day production default so a live testnet demo round actually
        // completes in a reasonable observation window. See docs/ARCHITECTURE.md.
        uint256 roundDuration = vm.envOr("ROUND_DURATION_SECONDS", uint256(2 hours));
        uint256 claimExpiry = vm.envOr("CLAIM_EXPIRY_SECONDS", uint256(6 hours));

        vm.startBroadcast(deployerKey);
        Deployment memory d = _deployAndWire(deployer, depositCap, roundDuration, claimExpiry);
        vm.stopBroadcast();

        _logDeployment(d);
    }
}
