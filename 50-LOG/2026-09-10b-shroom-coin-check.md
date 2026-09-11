---
id: log.shroom-coin-check-2026-09-10b
t: log
v: 1
upd: 2026-09-10
machine: connal
---
# SHROOM (MUSHROOM) — address-paste lookup, Robinhood chain

Connal pasted `0xab093def657f15df31b33922a95e047add645b29` in chat asking to research it. No
decisions.md row. Prior vault record found: `50-LOG/signals-Connals-Air.jsonl` — the app itself
already saw and rejected this coin two days ago.

## fact: prior app signal, 2026-09-08 ~22:28 EDT
Five FOMO-sell events from followed traders (`notanicecat69`, `pedrigavifrenki`, `RugDalio`)
selling $1.9K-$21K each while SHROOM sat at $17-18.7M market cap, followed immediately by the
app's own admission check: **admit: false, tier: red**, reason "followed traders are selling this,
not buying (3 seller(s), 0 buyers)." Price recorded then: $0.01821.

## fact: live market data (DexScreener API, live pull this session)
- Name: MUSHROOM, ticker SHROOM. Chain: "robinhood" (Robinhood's own chain — new, not one I have
  independent background on, not inventing detail beyond what the data shows). DEX: Uniswap v4.
- Three separate pools, priced against three different assets, and they disagree with each other
  right now:
  - vs MU (tokenized Micron Technology stock): price $0.01904, mcap ~$18.8M, liquidity $383K.
  - vs USDG (a stablecoin): price $0.01959, mcap ~$19.3M, liquidity $565K.
  - vs PONS (a smaller token): price $0.02777, mcap ~$27.4M, liquidity only $53K.
  The PONS pool is pricing SHROOM ~42% above the other two — a real price gap, not a data error,
  most likely because that pool is thin and hasn't been arbitraged back in line yet.
- 24h change: +12% to +18% across the two liquid pools. 24h volume: $319K and $3.93M respectively —
  the second pool is doing most of the real trading.
- Sell pressure by count is heavier than buy pressure in the biggest pool over the last 6h (475 buys
  vs 1,049 sells) — more people selling than buying, but price still rose, meaning the buys are
  bigger on average, not that there are more of them.
- Real social presence exists: x.com/shroom_network, t.me/fungalstate — not an anonymous-only
  listing, though a Twitter/Telegram existing doesn't itself prove anything about the team.

## fact: no rug-check equivalent available
RugCheck (used for the Solana coins in this pattern) doesn't cover this chain, and I did not find
an equivalent scanner for it this session. Mint/freeze authority, holder concentration, and
LP-lock status are **not checked** here — flagging as a real gap, not silently skipping it.

## ∴ what this means, conf ~55% (lower than usual — key checks unavailable)
Two days ago, several traders the app follows sold into this exact coin at almost the same price
it's at right now, and the app's own rule correctly read that as a red flag. Since then price has
gone slightly up, not down — so the immediate "everyone dump it" read didn't play out over 48
hours. But the standard rug checks (who controls the contract, whether liquidity can be pulled,
how concentrated the holders are) aren't available on this chain this session, so this read is
missing the checks that usually carry the most weight. The three-way price disagreement between
pools is also a sign of a market that isn't fully "settled" yet.

## falsifier
Wrong (safer than this read suggests) if the two liquid pools keep holding gains over the next few
days with buy count catching up to sell count. Confirmed (this read was right to be cautious) if
price rolls over toward the $0.018-0.019 level it was rejected at, or lower, especially if the
PONS-pool premium collapses as sellers hit it.

## vibe / unknown — explicitly not fabricated
No independent knowledge of the "Robinhood chain" itself, the SHROOM/Mushroom project, or its team
beyond what these two data pulls show — not inventing a backstory. Holder count, contract
ownership, and LP-lock status are unknown this session (see gap above).

## SOURCES
- DexScreener API, token `0xab093def657f15df31b33922a95e047add645b29` — live pull, this session.
- `50-LOG/signals-Connals-Air.jsonl` — prior FOMO-sell + admission-reject signals, same address,
  2026-09-08.
