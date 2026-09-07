# Testnet Contract Verification

Source verification record for the YieldJack testnet-MVP contract suite deployed to Robinhood
Chain Testnet, as prepared for the public testnet beta.

**This is a testnet-only, unaudited deployment.** `MockUSDG`, `MockJACK`, and `MockYieldSource`
are faucet-mintable demo tokens with no real value. `DemoRandomnessProvider` uses
block-hash-derived randomness that is manipulable by miners/validators and is explicitly
insecure — see `docs/THREAT_MODEL.md`. Do not send real assets to any address on this page, and
never deploy this configuration to mainnet (see CLAUDE.md, "Never deploy to mainnet").

## Chain and deployment information

| Field | Value |
| --- | --- |
| Network | Robinhood Chain Testnet |
| Chain ID | 46630 |
| RPC | https://rpc.testnet.chain.robinhood.com |
| Explorer | https://explorer.testnet.chain.robinhood.com |
| Verifier API | https://explorer.testnet.chain.robinhood.com/api/ |
| Deployer address | `0xB1Ab03b38adc8e81F2E86E7B9D33A4b33d3736C0` |
| Deploy script | `packages/contracts/script/DeployTestnet.s.sol` (via `DeployBase.s.sol`) |
| Deployed at | 2026-09-07T12:00:45.873Z (per `deployments/46630.json`) |

## Compiler / build settings

Matches `packages/contracts/foundry.toml` `[profile.default]` exactly — the same configuration
used for the original deployment build.

| Setting | Value |
| --- | --- |
| Solidity version | 0.8.26 |
| EVM version | Cancun |
| Optimizer | enabled |
| Optimizer runs | 200 |
| via_ir | false |

## Contracts

All seven contracts were confirmed unverified prior to this work, verified via
`forge verify-contract --verifier blockscout`, and independently re-confirmed as verified by
querying the Blockscout `v2/addresses/{address}` API directly (`is_verified: true`) rather than
relying solely on the CLI's own success message.

| Contract | Address | Explorer link | Status |
| --- | --- | --- | --- |
| MockUSDG | `0x0adEA73eB64B0eB9e48B86880784Ca06dF77c665` | https://explorer.testnet.chain.robinhood.com/address/0x0adea73eb64b0eb9e48b86880784ca06df77c665 | Verified |
| MockJACK | `0xb91364c52Ec2D8c40D4Aae8891E5C93EA9632de0` | https://explorer.testnet.chain.robinhood.com/address/0xb91364c52ec2d8c40d4aae8891e5c93ea9632de0 | Verified |
| MockYieldSource | `0x29EC4884f3C1c9301541324ff3cC201B4E698d10` | https://explorer.testnet.chain.robinhood.com/address/0x29ec4884f3c1c9301541324ff3cc201b4e698d10 | Verified |
| DemoRandomnessProvider | `0x2aA855DDe4495415961beb8C3a257DAFFAb05f0D` | https://explorer.testnet.chain.robinhood.com/address/0x2aa855dde4495415961beb8c3a257daffab05f0d | Verified |
| YieldJackVault | `0xA3027CE9ad5c2f5005Cb728Dd2a77061da942f76` | https://explorer.testnet.chain.robinhood.com/address/0xa3027ce9ad5c2f5005cb728dd2a77061da942f76 | Verified |
| DemoPrizeEngine | `0xc682C9db096D737D780E337e6E6dC97FC3fB23E2` | https://explorer.testnet.chain.robinhood.com/address/0xc682c9db096d737d780e337e6e6dc97fc3fb23e2 | Verified |
| SponsorRegistry | `0xf9CcbB7cA435bB15aB76DFF72A45871526AAC71A` | https://explorer.testnet.chain.robinhood.com/address/0xf9ccbb7ca435bb15ab76dff72a45871526aac71a | Verified |

Addresses are taken verbatim from `deployments/46630.json`, the deploy pipeline's own output —
none were hand-typed or guessed, per CLAUDE.md.

## Constructor arguments

Recovered from `packages/contracts/script/DeployBase.s.sol` / `DeployTestnet.s.sol` (env-var
defaults: `DEPOSIT_CAP=1_000_000e6`, `ROUND_DURATION_SECONDS=2 hours`,
`CLAIM_EXPIRY_SECONDS=6 hours`), cross-checked against the local (gitignored) broadcast artifact
at `packages/contracts/broadcast/DeployTestnet.s.sol/46630/run-latest.json`, and independently
confirmed via read-only `cast call` queries against the live contracts
(`owner`/`minters`/`asset`/`yieldSource`/`depositCap`/`vault`/`randomnessProvider`/
`roundDuration`/`claimExpiry`/`sponsorRegistry`/`prizeEngine`/`usdg`/`jack`/`minJackBurn`). All
three sources agreed exactly; no argument was guessed.

| Contract | Constructor | Arguments |
| --- | --- | --- |
| MockUSDG | `constructor(address initialOwner)` | deployer |
| MockJACK | `constructor(address initialOwner)` | deployer |
| MockYieldSource | `constructor(IERC20 asset_)` | MockUSDG address |
| DemoRandomnessProvider | `constructor(address initialOwner)` | deployer |
| YieldJackVault | `constructor(IYieldSource, uint256 initialDepositCap, address initialOwner)` | MockYieldSource address, `1000000000000` (1,000,000 mUSDG, 6dp), deployer |
| DemoPrizeEngine | `constructor(YieldJackVault, IRandomnessProvider, address initialOwner, uint256 roundDuration_, uint256 claimExpiry_)` | YieldJackVault address, DemoRandomnessProvider address, deployer, `7200` (2h), `21600` (6h) |
| SponsorRegistry | `constructor(IPrizeEngine, IERC20 usdg_, IBurnableERC20 jack_, uint256 minJackBurn_, address initialOwner)` | DemoPrizeEngine address, MockUSDG address, MockJACK address, `100000000000000000000` (100 mJACK), deployer |

## Verification date

2026-09-07 (UTC)

## Method

```
forge verify-contract <address> <path>:<ContractName> \
  --chain-id 46630 \
  --verifier blockscout \
  --verifier-url https://explorer.testnet.chain.robinhood.com/api/ \
  --rpc-url https://rpc.testnet.chain.robinhood.com \
  --compiler-version 0.8.26 \
  --num-of-optimizations 200 \
  --evm-version cancun \
  --constructor-args <abi-encoded args> \
  --watch
```

No wallet private key was used or required — `forge verify-contract` only submits source and
metadata to the Blockscout verifier API and reads chain state; it never broadcasts a transaction.
Every submission reported `Pass - Verified`, and every result was independently re-confirmed via
`GET /api/v2/addresses/{address}` returning `is_verified: true`.
