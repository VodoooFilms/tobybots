# Launch Readiness Checklist — Toby Bots Arena

## ✅ Contracts

- [x] $SIGNAL deployed on Sepolia
- [x] Arena deployed on Sepolia
- [x] Arena whitelisted in $SIGNAL
- [x] 3 seed agents created (doomgpt, bulltard, weatherwiz)
- [x] Both contracts verified on Etherscan
- [x] Both contracts verified on Sourcify
- [x] 23 tests passing (current local suite)
- [x] Security audit completed (Fase 1 hotfix applied)
- [x] `emergencyRefund` returns real funds (was empty before)
- [x] `withdrawFees` functional
- [x] `settleDeadline` enforced
- [x] Frontend prototype reads live Sepolia state

## ✅ Documentation

- [x] `README.md` — project overview, tokenomics, state machine
- [x] `docs/DEPLOYMENT.md` — addresses, deploy date, constructor args, verification
- [x] `docs/TESTNET_PLAYBOOK.md` — step-by-step test flows
- [x] `docs/BRAND_SYSTEM.md` — brand architecture, taxonomy, naming, voice
- [x] `docs/LAUNCH_CHECKLIST.md` — this file
- [x] `FAQ.md` — short operator FAQ for demo handling

## ✅ Network & Wallet

- [x] Sepolia RPC confirmed working (1rpc.io)
- [ ] Deployer wallet has ETH for operations (`0.000991372021605331 ETH` remaining on May 6, 2026)
- [x] Deployer wallet holds 100M $SIGNAL (full supply)
- [ ] Test users funded with $SIGNAL (depends on demo prep)
- [ ] Test users have Sepolia ETH (they use faucets)

## ✅ Seeded Content

- [x] 3 agents with names and specialties
- [ ] At least 1 demo duel created and settled (for UI testing)
- [ ] At least 1 demo duel with claims available
- [ ] At least 1 closed/refunded duel for testing that flow

## ✅ Code & Tooling

- [x] `npm test` runs 19 tests
- [x] `npx hardhat compile` passes
- [x] Deploy scripts working (`scripts/deploy.js`, `scripts/deploy-arena.js`)
- [x] Verify script working (`scripts/verify-deploy.js`)

## ⚠️ Known Risks

### Centralized settlement

Only the owner can call `settle()`. `emergencyRefund()` is permissionless after expiry, so users can still unlock refunds if the owner disappears.

**Mitigation for demo:** Owner wallet is controlled by the team. Acceptable for testnet.

**Current nuance:** this permissionless refund unlock exists in local code and tests, but the live Sepolia Arena has not been redeployed yet.

### Single-bet restriction

Each address can only bet once per duel (`require(bets[duelId][msg.sender] == 0)`). Users cannot increase their position.

**Mitigation:** Documented limitation. v2 feature.

### No auto-refund

If a duel expires, anyone can call `emergencyRefund()`. Refunds are still pull-based, so each bettor must call `claimRefund()` manually.

**Mitigation:** Owner must monitor duels. Acceptable for testnet with active owner.

### withdrawFees requires fee accrual

`withdrawFees()` only withdraws `accruedFees`, which are created when a duel is settled. It does not intentionally sweep active escrowed pools.

**Mitigation:** Still treat it as a post-settlement operator action and avoid calling it casually during demos.

### Owner wallet single point of failure

All $SIGNAL supply (100M), contract ownership, and settlement power are in one wallet (`0xC242...48FA`). The private key is in `~/.hermes/.env` on the local machine.

**Mitigation:** Back up the private key securely. Consider multisig for mainnet.

### Low operator ETH balance

The owner wallet currently holds `0.000991372021605331 ETH`, which is not enough for comfortable redeploys, funding flows, or repeated settlement operations.

**Mitigation:** top up Sepolia ETH before any new demo prep or contract migration.

## 📋 Pre-Launch Actions

Before showing the product publicly:

- [ ] Fund 2-3 test wallets with ETH (`0.02–0.05 ETH` each)
- [ ] Fund 2 test wallets with `$SIGNAL` (`2,000 SIGNAL` each)
- [ ] Create duel #1 with bets from 2 addresses on opposite sides
- [ ] Wait 1 hour minimum and settle duel #1
- [ ] Execute at least 1 successful `claimWinnings` on duel #1
- [ ] Create duel #2 and leave it `Open` for the live demo
- [ ] Create 1 expired duel + emergency refund (test Closed state)
- [ ] Write a 3-sentence HOWTO for the demo page
- [ ] Verify MetaMask add-token flow works with $SIGNAL address

### Suggested demo state

If you're short on time, this is the minimum convincing setup:

- 1 settled duel with a real winner and a claimed payout
- 1 open duel visible for new bets
- 2 demo wallets already funded and ready in MetaMask
- owner wallet online and ready to settle

## 📋 Post-Launch

- [ ] Monitor Sepolia Etherscan for unexpected transactions
- [ ] Keep deployer wallet funded with ETH
- [ ] Document any bugs found during demos
- [ ] Collect feedback on terminology (Duel vs Market, Back vs Bet, etc.)
