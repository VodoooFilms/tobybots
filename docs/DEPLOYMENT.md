# Deployment Record — Toby Bots Arena

## Network

- **Network:** Sepolia Testnet (chainId: 11155111)
- **RPC:** https://1rpc.io/sepolia
- **Deploy Date:** May 5, 2026

## Deployer

- **Address:** `0xC242829F7A7Fd6fe910738fe165ce5D19c1448FA`
- **ETH balance at deploy:** ~0.05 ETH
- **ETH balance on May 6, 2026:** `0.000991372021605331 ETH`

## Contracts

### $SIGNAL (SignalToken)

| Field | Value |
|-------|-------|
| **Address** | `0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3` |
| **Contract** | `contracts/SignalToken.sol:SignalToken` |
| **Compiler** | Solidity 0.8.26, EVM Cancun, optimizer 200 runs |
| **Constructor arg** | `0xC242829F7A7Fd6fe910738fe165ce5D19c1448FA` (feeCollector = deployer) |
| **Etherscan** | https://sepolia.etherscan.io/address/0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3#code |
| **Sourcify** | https://repo.sourcify.dev/contracts/full_match/11155111/0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3/ |
| **Status** | ✅ Verified (Etherscan + Sourcify) |

State:
- Total supply: 100,000,000 $SIGNAL
- Owner: deployer
- Fee collector: deployer
- Arena whitelisted: yes

### Arena

| Field | Value |
|-------|-------|
| **Address** | `0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1` |
| **Contract** | `contracts/Arena.sol:Arena` |
| **Compiler** | Solidity 0.8.26, EVM Cancun, optimizer 200 runs |
| **Constructor arg** | `0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3` ($SIGNAL address) |
| **Etherscan** | https://sepolia.etherscan.io/address/0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1#code |
| **Sourcify** | https://repo.sourcify.dev/contracts/full_match/11155111/0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1/ |
| **Status** | ✅ Verified (Etherscan + Sourcify) |

State:
- Owner: deployer
- duelCount at deploy: 0
- duelCount on May 6, 2026: 2
- agentCount: 3
- Arena cut: 2% (200 bps)

## Post-Deploy Steps Executed

1. ✅ Arena whitelisted in $SIGNAL (bypasses 1% transfer fee)
2. ✅ 3 seed agents created:

| ID | Name | Specialty | Creator |
|----|------|-----------|---------|
| 1 | doomgpt | Crypto macro | deployer |
| 2 | bulltard | Hopium futures | deployer |
| 3 | weatherwiz | Climate events | deployer |

## Verification Commands

If re-verification is ever needed:

```bash
# $SIGNAL
npx hardhat verify --network sepolia \
  0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3 \
  0xC242829F7A7Fd6fe910738fe165ce5D19c1448FA

# Arena
npx hardhat verify --network sepolia \
  0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1 \
  0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3
```

## Repository State at Deploy

- 19 tests passing (full coverage of core flows + edge cases)
- Audit completed (Fase 1 + 2)
- Brand system defined (`docs/BRAND_SYSTEM.md`)

## Current Local Head Status

As of May 9, 2026, the deployed Arena bytecode on Sepolia differs from the local compiled bytecode (live: 15362 hex chars, local: 15346 hex chars). The local `main` branch includes at minimum the following improvement **not live on Sepolia**:

- `emergencyRefund()` is permissionless locally, so any wallet can unlock refunds after `settleDeadline`

Owner wallet now has 0.101 ETH — sufficient for a redeploy when ready.

Current local test status:

- 23 tests passing
