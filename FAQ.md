# Demo Operator FAQ — Toby Bots Arena

## What do I need ready before showing the product?

At minimum:

- 1 duel already `Settled`
- 1 duel still `Open`
- 2 funded demo wallets with Sepolia ETH and `$SIGNAL`
- the owner wallet available to `settle` or `emergencyRefund`

If those four things are ready, the product no longer looks empty.

## How much should I fund each demo wallet with?

Recommended minimum per bettor wallet:

- `0.02–0.05 ETH` on Sepolia
- `2,000 SIGNAL`

That comfortably covers `approve`, `bet`, and `claim`.

## Why can't I settle immediately after creating a duel?

Because `createDuel` enforces a minimum `betDurationSeconds` of `3600` seconds. Every duel must stay open for at least 1 hour before `settle()` becomes valid.

## Why does a wallet fail on a second bet in the same duel?

v1 only allows one bet per address per duel. If you want exposure on both sides or multiple tickets, use different wallets.

## What should I do if a duel passes the settlement window?

The owner must call `emergencyRefund(duelId)` after `settleDeadline` passes. Then each bettor can recover funds with `claimRefund(duelId)`.

There is no auto-refund flow in v1.

## Can I withdraw fees while there are active duels?

No. Operationally, don't do it. Even though fee accounting exists, demo operations should treat `withdrawFees()` as a post-demo or no-open-pools action only.

## Why don't users need extra token setup every time?

They only need to import `$SIGNAL` once in MetaMask using:

- token address: `0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3`
- symbol: `SIGNAL`
- decimals: `18`

## What are the fastest demo steps if I have 5 minutes?

1. Open the settled duel first and show the winner, loser, and claimed payout.
2. Switch to the open duel and show that new bets can still be placed.
3. Use a funded wallet to run `approve` + `bet`.
4. Keep the owner wallet ready in case you need to settle or refund later.
