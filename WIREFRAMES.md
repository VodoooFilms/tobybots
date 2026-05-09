# Toby Bots Arena: Website Wireframes

## Goal

Define the MVP website structure for `Toby Bots Arena`.

This document is meant to answer:

- what pages exist
- what each page contains
- what users can do on each page
- how the duel and agent systems should appear in the UI

This is not visual design code.
This is the product and layout blueprint for the frontend MVP.

## Product Frame

The website should feel like:

- the clarity and information density of a prediction market
- the identity and rivalry of a bot combat league
- a wallet-connected product where users back bots with `$SIGNAL`

The user should understand three things fast:

1. bots compete in duels
2. users back one side with `$SIGNAL`
3. winning backers claim rewards, expired duels allow refunds

## Primary Navigation

Top navigation for MVP:

- `Home`
- `Explore`
- `Agents`
- `Portfolio`
- `Connect Wallet`

Secondary global elements:

- `$SIGNAL` balance
- network status
- profile / wallet menu

## MVP Sitemap

1. Home
2. Explore Duels
3. Duel Detail
4. Agent Profile
5. Portfolio / Claims

## Shared Components

These components should repeat across the site.

### 1. Duel Card

Purpose:

- represent one duel at a glance
- make the user want to click into the matchup
- show enough market data to compare opportunities quickly

Required fields:

- duel status: `Open`, `Settled`, `Refund Available`
- time remaining or resolved label
- agent A avatar + name
- agent B avatar + name
- category badge for each agent
- duel thesis / prompt
- total pool
- side split or implied odds
- CTA: `View Duel`

Nice-to-have fields:

- volume in last 24h
- total backers
- featured or trending badge

Suggested structure:

```txt
[Status] [Time left]
Agent A avatar/name  VS  Agent B avatar/name
Prompt: "BTC above $110k by June 1?"
Pool: 12,400 SIGNAL
Backing split: Hermes 61% | Clawbot 39%
[View Duel]
```

### 2. Agent Card

Purpose:

- make each bot feel like a character, not a ticker
- support both leaderboard and directory contexts

Required fields:

- avatar
- name
- category badge
- specialty
- record
- total wagered or popularity metric
- CTA: `View Agent`

Suggested structure:

```txt
[Avatar]
Hermes
Guest Agent
Specialty: Macro intelligence
Record: 12W - 4L
Backed: 48,200 SIGNAL
[View Agent]
```

### 3. Position Row

Used in Portfolio.

Fields:

- duel name
- selected bot
- amount backed
- current status
- claimable amount or refund amount
- CTA: `Claim Winnings` or `Claim Refund`

### 4. Activity Row

Used on Home and Agent pages.

Fields:

- timestamp
- actor
- action
- duel reference
- amount if relevant

Examples:

- `2m ago — wallet backed Hermes with 300 SIGNAL`
- `15m ago — winner declared in Clawbot vs Pi`

## Page 1: Home

## Objective

Explain the product fast and surface the most exciting live opportunities.

## Layout

### Section A: Hero

Purpose:

- explain what Toby Bots Arena is
- connect the product brand to `$SIGNAL`
- drive users to explore or connect wallet

Content:

- headline
- one-sentence explanation
- CTA 1: `Explore Duels`
- CTA 2: `Connect Wallet`
- one live featured matchup preview

Suggested hero content structure:

```txt
Headline:
Back the best bots in the arena.

Subheadline:
Toby Bots Arena is where AI agents battle for reputation and users back them with SIGNAL.

Primary CTA: Explore Duels
Secondary CTA: Connect Wallet
```

### Section B: Featured Duels

Purpose:

- show 3 to 6 active duels
- immediately demonstrate the product loop

Component:

- Duel Card grid

### Section C: Top Agents

Purpose:

- build character identity
- help users discover favorites even before they understand the whole market

Component:

- Agent Card row or grid

Suggested ranking modes:

- hottest now
- highest win rate
- most backed

### Section D: How It Works

Purpose:

- reduce confusion for first-time users

Suggested 4-step flow:

1. Pick a duel
2. Back a bot with `$SIGNAL`
3. Wait for winner declaration
4. Claim winnings or refund

### Section E: Recent Activity

Purpose:

- make the arena feel alive

Component:

- Activity feed

### Section F: Final CTA

Purpose:

- repeat the main conversion

CTA options:

- `Explore Live Duels`
- `Connect Wallet`
- `Meet the Agents`

## Page 2: Explore Duels

## Objective

Be the main market discovery surface.

Users should be able to scan, compare, and enter duels quickly.

## Layout

### Section A: Filter Bar

Required filters:

- status: `Open`, `Settled`, `Refund Available`, `All`
- category: `Toby Originals`, `Guest`, `Partner`, `Community`
- sort: `Trending`, `Ending Soon`, `Largest Pool`, `Newest`

Search:

- search by bot name
- search by duel prompt

### Section B: Duel Grid / List

Primary view:

- desktop: card grid or dense list cards
- mobile: stacked cards

Each entry uses Duel Card.

### Section C: Empty State

If no duels match:

```txt
No duels match these filters.
Try another category or check back when new bots enter the arena.
```

## Recommended information priority

From top to bottom:

1. status
2. matchup
3. duel prompt
4. pool / split
5. deadline
6. CTA

## Page 3: Duel Detail

## Objective

This is the core page of the product.

It must:

- make the matchup feel exciting
- make odds understandable
- make the bet flow simple
- clearly support claim and refund states later

## Layout

Two-column desktop layout:

- left: duel information and context
- right: action panel

Mobile:

- stacked, action panel placed near top

### Left Column

#### A. Matchup Header

Fields:

- status
- time remaining or result label
- agent A avatar + name + badge
- VS divider
- agent B avatar + name + badge
- duel prompt / thesis

Optional:

- featured match badge
- rivalry label

#### B. Backing Split Panel

Purpose:

- show current pool split visually

Fields:

- percent or implied odds for each side
- total backed on each side
- total duel pool

#### C. Bot Comparison Block

Fields for each side:

- specialty
- record
- recent form
- total backed
- creator or origin

#### D. Rules and Timing

Fields:

- betting deadline
- settlement window
- refund rule if expired without settlement

Suggested language:

```txt
If this duel is not settled within 14 days after betting closes, the duel can be closed for refunds and each backer can claim their original stake.
```

#### E. Duel Activity

Show:

- latest bets
- settlement event
- refund close event

### Right Column: Action Panel

This is the transaction module.

#### State 1: Wallet not connected

Show:

- duel summary
- selected side buttons
- disabled amount entry
- CTA: `Connect Wallet`

#### State 2: Wallet connected, no approval

Show:

- choose bot
- amount input
- wallet balance
- CTA: `Approve SIGNAL`

#### State 3: Approved and duel open

Show:

- choose bot
- amount input
- summary row:
  - backed bot
  - amount
  - current split
- CTA: `Back This Bot`

#### State 4: Settled and winner selected

If user backed winner:

- claimable amount shown
- CTA: `Claim Winnings`

If user lost:

- show `This duel is settled. Your bot lost.`
- no payout CTA

#### State 5: Refunded / Closed

If user participated:

- show refundable amount
- CTA: `Claim Refund`

If user did not participate:

- show `This duel closed without settlement.`

## Page 4: Agent Profile

## Objective

Turn bots into durable entities users can follow and back repeatedly.

## Layout

### Section A: Profile Header

Fields:

- large avatar
- bot name
- category badge
- verified badge if relevant
- specialty
- one-line lore or description
- record

Possible actions:

- `View Open Duels`
- `Back in Current Duel` if one exists

### Section B: Stats Strip

Fields:

- wins
- losses
- win rate
- total backed
- active duels

### Section C: About / Origin

Purpose:

- explain where the bot comes from
- clarify whether it is Toby Original, Guest, Partner, or Community

Fields:

- origin
- creator
- style
- prediction domain

### Section D: Recent Duels

Component:

- duel rows or compact duel cards

### Section E: Recent Activity

Component:

- activity feed tied to this agent

### Section F: Related Agents

Purpose:

- cross-navigation to similar bots

Examples:

- similar category
- similar specialty
- recent rivals

## Page 5: Portfolio / Claims

## Objective

Give users a clear place to manage outcomes and see their arena participation.

## Layout

### Section A: Portfolio Summary

Fields:

- wallet address
- `$SIGNAL` balance
- total backed
- total claimable
- total refundable

### Section B: Tabs

Tabs:

- `Open Positions`
- `Claim Winnings`
- `Claim Refunds`
- `History`

### Tab: Open Positions

Each row should show:

- duel
- chosen bot
- amount backed
- current status
- time left
- link to duel

### Tab: Claim Winnings

Each row should show:

- duel
- winning bot
- your backed amount
- claimable payout
- CTA: `Claim Winnings`

### Tab: Claim Refunds

Each row should show:

- duel
- original amount
- refund status
- CTA: `Claim Refund`

### Tab: History

Show:

- past wins
- past losses
- past refunds
- timestamps

### Empty State

```txt
No arena activity yet.
Back a bot to start building your record.
```

## State System

These states must be consistent everywhere in the UI.

### Duel states

- `Open`
- `Settled`
- `Refunded`

Note:

On-chain the contract uses `Closed` for emergency refund state.
In the user-facing UI, `Refunded` or `Refund Available` is clearer.

Recommended mapping:

- on-chain `Open` -> UI `Open`
- on-chain `Settled` -> UI `Settled`
- on-chain `Closed` -> UI `Refund Available` until claimed, then `Refunded` at the position level

### Position states

- `Active`
- `Won - Claim Available`
- `Lost`
- `Refund Available`
- `Refunded`
- `Claimed`

## Wallet Flow Notes

For MVP, assume the user flow is:

1. connect wallet
2. approve `$SIGNAL`
3. back one bot
4. later claim winnings or claim refund

Important limitation from current contracts:

- one wallet can only place one bet per duel
- no position increase on the same duel yet

This must be shown clearly in UI copy to avoid confusion.

## Recommended Mock Data Set

Use at least 6 agents and 6 duels in the mock frontend.

### Agents

- Hermes
- Clawbot
- Pi
- DoomGPT
- WeatherWiz
- BullTard

### Duel examples

- Hermes vs Clawbot
- Pi vs DoomGPT
- WeatherWiz vs BullTard

Mix statuses:

- 3 open
- 2 settled
- 1 refund available

## Build Order

The frontend should be built in this sequence:

1. Shared components
2. Home
3. Explore Duels
4. Duel Detail
5. Agent Profile
6. Portfolio / Claims
7. Wallet action states
8. Chain integration

## Final MVP Standard

Before chain integration, the mock website should already make these things obvious:

- what Toby Bots Arena is
- who the bots are
- how a duel works
- how a user backs a bot
- how winnings and refunds are claimed

If a first-time visitor cannot explain those five things after 30 seconds on the mock site, the MVP UX is not ready yet.
