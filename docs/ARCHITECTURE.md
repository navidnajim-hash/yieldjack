# Architecture

## Overview

YieldJack is a prize-savings dApp: users deposit a stablecoin, the deposit is routed into a
yield-generating venue, and the realized yield (never the principal) funds a recurring prize
drawn from eligible depositors weighted by how much they deposited and how long they held it.

This document describes the **testnet MVP** architecture actually implemented in this
repository. See [PRODUCTION_ROADMAP.md](PRODUCTION_ROADMAP.md) for what changes before any
production deployment, and [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) for the design
inspiration (PoolTogether V5) and why no code from it was reused.

## System diagram

```mermaid
flowchart TB
    subgraph Frontend["apps/web (Next.js, static export)"]
        UI[Dashboard / Landing / Draws / Transparency]
    end

    subgraph Keeper["apps/keeper (optional)"]
        K[Poll loop]
    end

    User((User wallet)) -->|deposit / withdraw / faucet / sponsor| UI
    UI -->|read + write via wagmi/viem| Chain

    subgraph Chain["Robinhood Chain Testnet (or local Anvil)"]
        Vault[YieldJackVault]
        YS[MockYieldSource\nERC-4626]
        Engine[DemoPrizeEngine]
        RNG[DemoRandomnessProvider]
        Sponsor[SponsorRegistry]
        USDG[MockUSDG]
        JACK[MockJACK]
    end

    Vault -->|routes principal| YS
    Vault -->|snapshotAndReset / pullYield| Engine
    Engine -->|requestRandomness / fulfillRandomness| RNG
    Sponsor -->|addSponsorFunds| Engine
    Sponsor -->|burn| Burn[0x...dEaD]
    Vault -.asset.-> USDG
    Sponsor -.asset.-> USDG
    Sponsor -.burns.-> JACK
    YS -.asset.-> USDG

    K -->|closeRound / fulfillRandomness / finalize\n(same permissionless calls a user could make)| Chain
```

## Contract responsibilities

All contracts live in `packages/contracts/src/`.

### `interfaces/`

- **`IYieldSource`** — minimal ERC-4626-shaped interface (`asset`, `deposit`, `withdraw`,
  `totalAssets`, `totalAssetsOf`) so `YieldJackVault` never depends on `MockYieldSource`
  concretely. Swapping in a real yield venue means deploying a new contract that implements this
  interface.
- **`IRandomnessProvider`** — `requestRandomness` / `isFulfilled` / `getRandomness`. Swapping in
  a verifiable randomness source means deploying a new implementation of this interface.
- **`IPrizeEngine`** — the surface `SponsorRegistry` depends on (`currentRoundId`,
  `roundState`, `addSponsorFunds`).

### `tokens/MockUSDG.sol`, `tokens/MockJACK.sol`

Worthless, faucet-mintable ERC-20s (6 and 18 decimals respectively) standing in for USDG and the
future real `$JACK` token. `MockUSDG` has a minter allowlist (owner + `MockYieldSource`, so
simulated yield can mint itself) rather than being owner-mint-only.

### `yield/MockYieldSource.sol`

An ERC-4626 vault over `MockUSDG`. `simulateYield(amount)` mints `amount` of `MockUSDG` directly
into the vault's own balance, raising `totalAssets()` — and therefore every existing
depositor's redeemable value — exactly the way real yield would, entirely on-chain. Two
deliberate safety properties, both added after the invariant-fuzz test suite found the
alternative was exploitable (see [ACCOUNTING_INVARIANTS.md](ACCOUNTING_INVARIANTS.md)):

1. `simulateYield` reverts if `totalSupply() == 0` — donating into an empty pool is the classic
   ERC-4626 share-inflation attack.
2. The effective per-call cap is `min(MAX_SIMULATED_YIELD_PER_CALL, totalAssets())` — yield can
   at most double the pool in one call, since real yield is proportional to TVL and an
   unbounded ratio compounds floor-rounding into a visible amount.
3. `_decimalsOffset()` returns `6` (OpenZeppelin's standard virtual-shares defense-in-depth
   against the same attack class).

### `randomness/DemoRandomnessProvider.sol`

Derives a "random" value from `keccak256(blockhash(targetBlock), requestId, chainid, address)`,
where `targetBlock` is `MIN_DELAY_BLOCKS` (1) after the request. **This is not secure
randomness** — block hashes are public and their timing is influenceable — and the contract's
NatSpec, the UI, and this document all say so explicitly. `fulfillRandomness` is permissionless
(mirrors the "Fulfil demo randomness" step a user performs from the app).

### `vault/YieldJackVault.sol`

Custody and accounting. Tracks each user's `principal` internally — **no receipt/share token is
minted to depositors** (see [ACCOUNTING_INVARIANTS.md](ACCOUNTING_INVARIANTS.md) for why).
Maintains a bounded (`MAX_PARTICIPANTS = 256`, testnet-only) active-depositor set and a
per-round, per-user time-weighted eligibility accumulator — an original, simplified analogue of
a TWAB (see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) for why it's simpler than
PoolTogether's TwabController and why that's the right choice here). `pause()` blocks new
deposits only; `withdraw()` has no pause gate, so a pause can never trap funds.

### `prize/DemoPrizeEngine.sol`

The round state machine: `OPEN → RANDOMNESS_REQUESTED → AWARDED → CLAIMED` or `→ EXPIRED`.
Every transition function (`closeRound`, `finalize`, `claim`, `rollover`) is permissionless.
Winner selection is a deterministic cumulative-weight walk over the snapshot taken at close —
`msg.sender` never affects the outcome, and no function lets any address (including the owner)
overwrite a round's winner. Prize funds come only from `YieldJackVault.pullYield` (realized
yield) and `SponsorRegistry` contributions; principal is never readable or transferable from this
contract.

### `prize/SponsorRegistry.sol`

Lets anyone fund the currently open round's prize in `MockUSDG` while burning a configurable
amount of `MockJACK`. Only ever touches `prizeAmount` — never weights — so sponsorship cannot buy
better odds.

## Frontend (`apps/web`)

Next.js App Router, static export (`output: "export"`), TypeScript strict mode, Tailwind CSS v4,
wagmi v2 + viem + RainbowKit for wallet connection, TanStack Query for cache/refetch. Every
number shown is a live `useReadContract`/`useReadContracts` call against the deployment manifest
in `deployments/<chainId>.json` — there is no mocked or hand-typed data path. See
`apps/web/src/hooks/useYieldJackData.ts` for the read hooks and
`apps/web/src/hooks/useTxState.ts` for the shared transaction-state machine used by every
write-path form.

## Keeper (`apps/keeper`)

An optional TypeScript polling loop that calls the same permissionless functions the frontend's
testnet controls call. It exists purely for convenience (so a draw can progress without anyone
having a browser tab open) — see `apps/keeper/src/index.ts`. `DRY_RUN=true` by default.

## Deployment pipeline

1. `forge script script/DeployLocal.s.sol` (or `DeployTestnet.s.sol`) deploys and wires all
   seven contracts, writing Foundry's standard broadcast artifact.
2. `scripts/build-deployment-manifest.mjs` parses that broadcast artifact and writes
   `deployments/<chainId>.json` in the schema `apps/web` and `apps/keeper` import directly.
3. `scripts/sync-abis.mjs` extracts each contract's ABI from `packages/contracts/out/` into
   `packages/config/src/abis.ts`.

Both the frontend and the keeper import `deployments/<chainId>.json` and the generated ABIs
rather than duplicating any address or interface by hand.
