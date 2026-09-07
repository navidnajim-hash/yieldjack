// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import { Script, console2 } from "forge-std/Script.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import { IPonsV2LaunchFactory, LaunchConfig } from "../src/interfaces/IPonsV2LaunchFactory.sol";
import { IPonsV2FeePolicy, FeePolicySnapshot } from "../src/interfaces/IPonsV2FeePolicy.sol";

/// @title PrintPonsV2State
/// @notice Read-only reporting script: prints the current pons V2 addresses, enabled launch
///         configuration, fee policy, and a `previewLaunchEconomics` digest for every enabled
///         config against the native ETH quote asset. Makes no state-changing calls and never
///         broadcasts — every call here is a `view`/`pure` read. Run it with:
///
///           forge script script/PrintPonsV2State.s.sol --rpc-url $ROBINHOOD_MAINNET_RPC_URL
///
///         (no `--broadcast`; there is nothing to broadcast). Re-run this immediately before any
///         future real JACK launch — `expectedEconomics` must come from a fresh
///         `previewLaunchEconomics` call, never a value cached from an earlier run, since the
///         owner-adjustable terms it commits to (fee policy, launch config) can change at any
///         time. See docs/JACK_ARCHITECTURE.md for how the addresses below were verified.
contract PrintPonsV2State is Script {
    // Verified against live Robinhood Chain mainnet state and the official pons V2 source at
    // commit 8b9bf371030279133017b5c1b713823f5889c5d2 — see docs/JACK_ARCHITECTURE.md. Treat
    // these as candidates re-confirmed by this script's own bytecode/chain-id checks below, not
    // as unquestionable constants.
    address internal constant PONS_V2_FACTORY = 0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e;
    address internal constant ROBINHOOD_WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;

    function run() external view {
        require(block.chainid == 4663, "PrintPonsV2State: must run against chain id 4663 (Robinhood Chain mainnet)");
        require(PONS_V2_FACTORY.code.length > 0, "PrintPonsV2State: factory has no deployed bytecode");

        IPonsV2LaunchFactory factory = IPonsV2LaunchFactory(PONS_V2_FACTORY);

        console2.log("================================================================");
        console2.log("pons V2 factory state - Robinhood Chain mainnet (chain id 4663)");
        console2.log("================================================================");
        console2.log("factory                ", PONS_V2_FACTORY);
        console2.log("owner                  ", factory.owner());
        console2.log("launchEnabled          ", factory.launchEnabled());
        console2.log("launchFee (wei)        ", factory.launchFee());
        console2.log("maxCreatorTaxBps       ", factory.maxCreatorTaxBps());
        console2.log("feeEscrow              ", address(factory.feeEscrow()));
        console2.log("memeHook               ", factory.memeHook());
        console2.log("launchDeployer         ", factory.launchDeployer());

        _printLaunchConfigs(factory);
        _printFeePolicy(factory);
        _printWeth();
    }

    function _printLaunchConfigs(IPonsV2LaunchFactory factory) internal view {
        uint256 configCount = factory.launchConfigCount();

        console2.log("");
        console2.log("--- launch configs ---");
        console2.log("launchConfigCount      ", configCount);

        for (uint256 i = 0; i < configCount; i++) {
            LaunchConfig memory config = factory.getLaunchConfig(i);
            console2.log("");
            console2.log("  config id            ", i);
            console2.log("  enabled              ", config.enabled);
            console2.log("  supply (wei)         ", config.supply);
            console2.log("  curveFeeBps          ", config.curveFeeBps);
            console2.log("  phantomQuote (wei)   ", config.phantomQuote);
            console2.log("  graduationThreshold  ", config.graduationThreshold);
            console2.log("  poolFee              ", uint256(config.poolFee));
            console2.log("  tickSpacing          ", int256(config.tickSpacing));

            if (!config.enabled) continue;

            bytes32 digest = factory.previewLaunchEconomics(i, address(0));
            console2.log("  previewLaunchEconomics digest (native ETH quote):");
            console2.logBytes32(digest);
        }
    }

    function _printFeePolicy(IPonsV2LaunchFactory factory) internal view {
        console2.log("");
        console2.log("--- fee policy (memeHook.currentFeePolicy) ---");
        IPonsV2FeePolicy feePolicy = IPonsV2FeePolicy(factory.memeHook());
        FeePolicySnapshot memory policy = feePolicy.currentFeePolicy();
        console2.log("protocolFeeRecipient   ", policy.protocolFeeRecipient);
        console2.log("protocolFeeShareBps    ", uint256(policy.protocolFeeShareBps));
        console2.log("buybackBurnBps         ", uint256(policy.buybackBurnBps));
        console2.log("hookFeeBps             ", uint256(policy.hookFeeBps));
        console2.log("maxInternalPriceImpactBps", uint256(policy.maxInternalPriceImpactBps));
        console2.log("feeSweepOperator       ", feePolicy.feeSweepOperator());
    }

    function _printWeth() internal view {
        console2.log("");
        console2.log("--- canonical Robinhood Chain WETH ---");
        console2.log("weth                   ", ROBINHOOD_WETH);
        require(ROBINHOOD_WETH.code.length > 0, "PrintPonsV2State: WETH has no deployed bytecode");
        console2.log("symbol                 ", IERC20Metadata(ROBINHOOD_WETH).symbol());
        console2.log("decimals               ", uint256(IERC20Metadata(ROBINHOOD_WETH).decimals()));
    }
}
