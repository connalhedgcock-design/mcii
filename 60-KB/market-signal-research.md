---
id: kb.market-signal-research
t: kb
v: 1
upd: 2026-09-02
machine: connal
prio: high
---
# MARKET DATA — what to actually pull out of the numbers, and what we already have but don't read
!! researched 2026-09-02 on Connal's instruction ("we need more market data like holder counts etc
... you need to really learn how to interpret data from the market and what to be looking for
across all coins"). Companion to [[social-signal-research]] (per-tweet) and
[[signal-architecture-research]] (how signals combine) — this one is the market sensor's equivalent
of the social research: what's worth extracting, ranked by evidence, and what it costs to get it.

## !! THE FIRST FINDING IS NOT "COLLECT MORE" — IT'S "READ WHAT'S ALREADY THERE"
Checked `data/market.jsonl` before assuming anything was missing. Every row already carries:
`price, mcap, liq, pools, holders, top1, top10, buys24, sells24, exitUsd/exitTok`.
- fact: `holders`, `top1`, `top10` are ALREADY collected, every 30 minutes, per tracked coin — the
  request for "more market data like holder counts" is partly already answered by data sitting in
  the record right now.
- !! fact, checked in code: `buys24` and `sells24` are written to every row and **read by nothing
  except the initial market-wide screener funnel.** Once a coin is tracked, these two numbers are
  saved and never looked at again. This is dead data — not missing, unread.
- ∴ the honest first step is not a new adapter, it is **using what is already being paid for and
  stored.** Building a new collector before reading the existing one would repeat this project's
  most common mistake in a new place.

## WHY HOLDER COUNT ITSELF IS ALREADY DELIBERATELY DOWN-WEIGHTED — read before "fixing" this
Decided 08-28, still correct, and worth restating so it is not silently reversed by this research:
- D-51: accumulation ranks on POOL state (liquidity, buy/sell flow), never on holder counts.
- D-57: a holder SURGE is MED, not good news — airdrops and wash distribution look identical to
  real buying from the outside.
- ∴ ! do not read "more holder data" as "weight holder count more heavily". The project already
  tried that framing and rejected it for a stated reason that still holds. What is missing is not
  MORE of this number — it is a better READING of the numbers already logged next to it.

## TIER 1 — SUPPORTED BY THE LITERATURE, AND CHEAP: TURN ON WHAT WE ALREADY COLLECT
- fact @MDPI *Survey on Pump and Dump Detection Using Machine Learning* (Future Internet 15(8):267):
  **concentration of trades among a small group of addresses is named as the critical red flag**,
  ahead of volume or price pattern alone.
- fact @Victor & Weintraud (WWW 2021, arXiv 2102.07001), already cited in
  [[whale-tracking/README]]: wash-trading structures are typically one or two accounts and involve
  **frequent self-trades** — i.e. the same red flag, from the manipulation side.
- ∴ ! **`buys24`/`sells24` should become a real feature, not a stored-and-ignored pair.** Two cheap,
  literature-backed reads, both computable from data already in hand:
  1. **buy/sell ratio, watched as a TREND, not a snapshot** — same shape as D-38's holder trend,
     applied to trade flow. A ratio that is rising while price is flat is the accumulation pattern
     D-38 already looks for; this is a second, independent way to see the same thing.
  2. **holder-concentration TREND (top10Pct/top1Pct rising or falling over successive readings)**,
     not the point-in-time number alone. `holders-onchain.jsonl` already stores `top10Pct`/`top1Pct`
     per reading — the trend is a query away, not a new collector.
- ! `est:` conf 75%. falsifier: if concentration trend and buy/sell-ratio trend turn out to track
  price change almost exactly (i.e. they say nothing price does not already say), they add no
  information and should be dropped rather than kept for their own sake.

## TIER 2 — GENUINELY MISSING, EVIDENCED, AND HONESTLY EXPENSIVE
- !! **DISTINCT BUYER COUNT is not the same thing as `buys24`, and the difference is the whole
  point.** `buys24` is a TRANSACTION count. One wallet buying ten times in an hour and ten wallets
  buying once each produce the identical number. This is the EXACT SAME FAILURE the social side
  already fixed by counting distinct credible people instead of raw post count (D-100) — the same
  mistake, in a different domain, still uncorrected here.
- fact: DexScreener's API (`app/main/adapters/dexscreener.js`, checked directly) returns `txns`
  as COUNTS ONLY — buys/sells — never addresses. Distinct buyers is not a field anyone sells us; it
  requires reading the pool's own swap transactions from the chain and counting unique signer
  addresses, the same kind of work `onchain.js` already does for holder ground-truth.
- ! `est:` conf 60% this is worth building, and it should NOT be built twice: this is very nearly
  the same machinery T-016/T-017 (whale/wallet tracking) already need — reading who is transacting
  on a pool, not just how many transactions happened. ∴ scope it as ONE piece of work, not two.
  Building a separate "distinct buyer" feature before wallet tracking exists would likely be thrown
  away and rebuilt once wallet tracking lands.
- falsifier: if, once built, distinct-buyer count and raw `buys24` move together almost always
  (i.e. genuine multi-wallet interest and single-wallet spam are rare to tell apart in practice for
  these coins), the extra engineering was not worth it and `buys24` alone was good enough.

## TIER 3 — NAMED, NOT RECOMMENDED YET
- **volume-to-liquidity ratio (turnover)**: `v24 / liq`, both already collected. Plausible read: a
  pool doing many times its own depth in daily volume is either genuine heavy trading or wash
  volume being pumped through a thin pool to look active — cannot be told apart from this number
  alone, needs pairing with the concentration trend above before it means anything on its own.
  ! `est:` conf 40% — flagged as a candidate, not proposed for building yet; needs the Tier 1 work
  live first to have something to cross-check it against.
- **liquidity-curve shape beyond the single 5%-slip number** already computed (`maxExitable`):
  Jupiter can be asked at multiple depths, giving a fuller picture of how "exitable" actually
  degrades size dS. Not evidenced as more useful than the single number the project already
  computes and displays — parked, not researched further, because nothing in the literature above
  asked for it specifically.

## ∴ WHAT THIS ANSWERS, PLAINLY
"More market data" and "learn to interpret it" turned out to be two different problems with two
different costs:
- the CHEAP half is not collecting anything new — it is finally reading `buys24`/`sells24` as a
  trend and tracking concentration change instead of a snapshot. Both are one query over data
  already sitting in the repo.
- the EXPENSIVE, GENUINELY NEW half is distinct buyer count, and it should be built as PART of
  wallet tracking (T-016/T-017), not as a fourth separate project, because the underlying work —
  reading who actually transacted, not just how many transactions happened — is the same work.

## SOURCES
- [A Survey on Pump and Dump Detection Using Machine Learning (MDPI Future Internet 15:8:267)](https://www.mdpi.com/1999-5903/15/8/267)
- [Detecting and Quantifying Wash Trading on Decentralized Cryptocurrency Exchanges (arXiv 2102.07001)](https://arxiv.org/pdf/2102.07001)
- [Machine Learning-Based Detection of Pump-and-Dump Schemes in Real-Time (arXiv 2412.18848)](https://arxiv.org/html/2412.18848v1) — order-book features checked and found NOT to transfer to AMM pools (no order book); cited for the general concentration/volume finding only, not for its specific feature list.
