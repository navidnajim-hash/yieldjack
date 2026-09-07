// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {MockUSDG} from "../src/tokens/MockUSDG.sol";
import {MockJACK} from "../src/tokens/MockJACK.sol";
import {MockYieldSource} from "../src/yield/MockYieldSource.sol";
import {DemoRandomnessProvider} from "../src/randomness/DemoRandomnessProvider.sol";
import {YieldJackVault} from "../src/vault/YieldJackVault.sol";
import {DemoPrizeEngine} from "../src/prize/DemoPrizeEngine.sol";
import {SponsorRegistry} from "../src/prize/SponsorRegistry.sol";
import {IYieldSource} from "../src/interfaces/IYieldSource.sol";
import {IRandomnessProvider} from "../src/interfaces/IRandomnessProvider.sol";

/// @title DeployBase
/// @notice Shared deployment + wiring logic for both the local Anvil and Robinhood Chain
///         Testnet deploy scripts. Deliberately has no mainnet variant — see
///         docs/PRODUCTION_ROADMAP.md and CLAUDE.md ("never deploy mainnet").
abstract contract DeployBase is Script {
    address internal constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    struct Deployment {
        MockUSDG usdg;
        MockJACK jack;
        MockYieldSource yieldSource;
        DemoRandomnessProvider randomness;
        YieldJackVault vault;
        DemoPrizeEngine engine;
        SponsorRegistry sponsorRegistry;
    }

    function _deployAndWire(address deployer, uint256 depositCap, uint256 roundDuration, uint256 claimExpiry)
        internal
        returns (Deployment memory d)
    {
        d.usdg = new MockUSDG(deployer);
        d.jack = new MockJACK(deployer);
        d.yieldSource = new MockYieldSource(d.usdg);
        d.usdg.setMinter(address(d.yieldSource), true);

        d.randomness = new DemoRandomnessProvider(deployer);
        d.vault = new YieldJackVault(IYieldSource(address(d.yieldSource)), depositCap, deployer);
        d.engine =
            new DemoPrizeEngine(d.vault, IRandomnessProvider(address(d.randomness)), deployer, roundDuration, claimExpiry);
        d.sponsorRegistry = new SponsorRegistry(d.engine, d.usdg, d.jack, BURN_ADDRESS, 100 ether, deployer);

        d.vault.setPrizeEngine(address(d.engine));
        d.randomness.setPrizeEngine(address(d.engine));
        d.engine.setSponsorRegistry(address(d.sponsorRegistry));
    }

    function _logDeployment(Deployment memory d) internal view {
        console2.log("MockUSDG               ", address(d.usdg));
        console2.log("MockJACK                ", address(d.jack));
        console2.log("MockYieldSource         ", address(d.yieldSource));
        console2.log("DemoRandomnessProvider  ", address(d.randomness));
        console2.log("YieldJackVault          ", address(d.vault));
        console2.log("DemoPrizeEngine         ", address(d.engine));
        console2.log("SponsorRegistry         ", address(d.sponsorRegistry));
    }
}
