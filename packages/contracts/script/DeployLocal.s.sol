// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { DeployBase } from "./DeployBase.s.sol";

/// @notice Deploys the full YieldJack testnet-MVP contract suite to a local Anvil node.
///         Uses Anvil's well-known default account #0 (public, standard for local dev — never
///         a real secret) unless DEPLOYER_PRIVATE_KEY is set in the environment.
///         Run via `pnpm demo:deploy` (after `pnpm demo:node` in another terminal).
contract DeployLocal is DeployBase {
    uint256 internal constant ANVIL_DEFAULT_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    function run() external {
        require(block.chainid == 31337, "DeployLocal: must run against chain id 31337 (anvil)");

        uint256 deployerKey = vm.envOr("DEPLOYER_PRIVATE_KEY", ANVIL_DEFAULT_KEY);
        address deployer = vm.addr(deployerKey);

        uint256 depositCap = vm.envOr("DEPOSIT_CAP", uint256(1_000_000e6));
        uint256 roundDuration = vm.envOr("ROUND_DURATION_SECONDS", uint256(15 minutes));
        uint256 claimExpiry = vm.envOr("CLAIM_EXPIRY_SECONDS", uint256(1 hours));

        vm.startBroadcast(deployerKey);
        Deployment memory d = _deployAndWire(deployer, depositCap, roundDuration, claimExpiry);
        vm.stopBroadcast();

        _logDeployment(d);
    }
}
