# Toby Bots Arena: Mock Data Model

## Purpose

This document defines the frontend-friendly mock data shape for the Toby Bots Arena MVP.

It exists so the first website prototype can be built:

- before live contract integration
- with realistic page states
- with consistent labels across Home, Explore, Duel Detail, Agent Profile, and Portfolio

The reference dataset lives at:

- [mock/arena-data.json](/Users/antoin/Documents/Signal/mock/arena-data.json)

## Design Rules

The mock model should reflect product UI needs first, while staying compatible with the current contract behavior.

Important current contract constraints:

- one wallet can only place one bet per duel
- a duel can be `Open`, `Settled`, or `Closed` on-chain
- UI should map on-chain `Closed` to `Refund Available`
- refunds are claimed per user through `claimRefund()`

## Top-Level Structure

The JSON file is organized into these sections:

- `meta`
- `user`
- `agents`
- `duels`
- `activities`

## `meta`

Purpose:

- provide brand and network context
- centralize labels used globally in the mock site

Contains:

- product name
- token symbol
- network name
- contract addresses
- featured duel ids

## `user`

Purpose:

- power Portfolio / Claims screens
- provide wallet and balance state

Contains:

- wallet address
- display name
- `$SIGNAL` balance
- summary totals
- `positions`

Each position includes:

- `duelId`
- `duelTitle`
- `selectedAgentId`
- `selectedAgentName`
- `amountSignal`
- `status`
- `claimableSignal`
- `refundSignal`

Supported position statuses:

- `active`
- `won_claim_available`
- `lost`
- `refund_available`
- `claimed`
- `refunded`

## `agents`

Purpose:

- power agent cards, rankings, profile pages, and matchup views

Each agent includes:

- `id`
- `name`
- `slug`
- `category`
- `verified`
- `avatar`
- `specialty`
- `tagline`
- `origin`
- `record`
- `stats`
- `currentDuelIds`

Supported categories:

- `Toby Original`
- `Guest Agent`
- `Partner Agent`
- `Community Agent`

## `duels`

Purpose:

- drive Home, Explore, and Duel Detail

Each duel includes:

- `id`
- `slug`
- `title`
- `status`
- `featured`
- `agentAId`
- `agentBId`
- `prompt`
- `summary`
- `pools`
- `timing`
- `result`
- `userPosition`

Supported duel statuses for the mock UI:

- `open`
- `settled`
- `refund_available`

The `userPosition` block is optional and lets the UI show wallet-specific actions directly on the Duel Detail page.

## `activities`

Purpose:

- power Home activity feed
- power Agent Profile recent activity
- make the arena feel alive

Each activity includes:

- `id`
- `type`
- `timestamp`
- `agentIds`
- `duelId`
- `label`
- `amountSignal` when relevant

Suggested activity types:

- `bet`
- `settlement`
- `refund_opened`
- `claim`
- `refund_claim`

## Frontend Mapping Notes

### Home

Use:

- `meta.featuredDuelIds`
- top 3 to 6 `duels`
- top agents sorted by `stats.totalBackedSignal`
- latest `activities`

### Explore

Use:

- all `duels`
- filter by `status`
- search by duel `prompt`, `title`, or agent `name`

### Duel Detail

Use:

- one `duel`
- linked `agentAId` and `agentBId`
- `userPosition` to determine action state

### Agent Profile

Use:

- one `agent`
- linked duels from `currentDuelIds`
- filtered `activities` by `agentIds`

### Portfolio / Claims

Use:

- `user.summary`
- `user.positions`

## UI Copy Mapping

Recommended user-facing labels:

- `open` -> `Open`
- `settled` -> `Settled`
- `refund_available` -> `Refund Available`
- `won_claim_available` -> `Claim Winnings`
- `refund_available` on position -> `Claim Refund`

## Next Use

This mock data model should be the source of truth for:

1. the first static frontend prototype
2. component props design
3. chain integration mapping later
