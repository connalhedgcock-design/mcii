---
id: log.20260826b
t: log
v: 1
---
# 2026-08-26 MEMORY LAYER BUILT
- geckoterminal adapter: free, no key, ~30rpm. 90 daily + 168 hourly candles. fills the gap dexscreener leaves.
  verified live: CATE 32 daily candles, NEEGY 44. instant backfill, $0.
- history.js: append-only JSONL, one file per token, in userData/history/.
  ! chose JSONL over sqlite deliberately: append-only means a crash costs ONE LINE not the store; no native deps; human-readable; imports anywhere. revisit only if size becomes real.
- records per reading: price, mcap, liq, pools, v24, buys24, sells24, exitUsd, exitTok, holders, top1, top10, verdict, flags.
- delta() returns NULL not 0 when n<2 ∴ UI says "not enough history recorded yet" instead of implying flat. ! never fabricate a zero.
- auto-poll every 10min while app open. records + broadcasts.
- charts: hand-rolled SVG, zero libs ∴ CSP intact, works offline against recorded data.

## ! THE POINT OF THIS LAYER
- price history is re-fetchable forever from geckoterminal. EXIT CAPACITY / HOLDER COUNT / TOP10-SHARE ON A GIVEN DAY IS NOT.
  nobody records it. it exists only because we started writing it down. every day not recorded is gone permanently.
- ∴ this had to precede social: hype data with no forward-outcome record is unevaluable, and worse, tradeable-looking. see [[grill]] G-01/G-02.

## GAP
- ! app closed = nothing recorded. no backfill possible for our own metrics.
  closes at P2 w/ shared postgres + GHA cron. until then, coverage = time connal has the app open.

## OPERATOR FEEDBACK 2026-08-26
- ! "stop worrying about what cate and neegy are doing, focus on building the app."
  > during BUILD turns: ship, report what works, no market commentary. analysis is a separate mode, on request.
  > this is a MODE preference, not a retraction of the analyst mandate. see D-18.
