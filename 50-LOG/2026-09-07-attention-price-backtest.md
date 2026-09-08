---
machine: connal
---

# 2026-09-07 — does raw attention (unfiltered sweep counts) actually lead price?

Connal asked directly: track unfiltered attention (not just the named-account/virality tracks),
break it down scan-by-scan AND day-by-day, and run backtests to see if the social scanner's raw
numbers point to anything. This was answerable without new code — `socialmarket.js`'s
`snapshot()`/`movers()` (unfiltered, credibility-weighted but not bot-excluded, all coins named in
a sweep) has been running since 2026-09-01 and every scan is already paired with live price in
`data/attention-prices.jsonl` for exactly this test. See [[mcii-vault-is-the-memory]].

Script: scratchpad, not checked in — `attention_price_test.py`, stdlib Python only (no
pandas/numpy on this machine). Re-runnable against the same file if more data accumulates.

## Data available
- `data/attention-prices.jsonl`: 4,480 rows, 654 distinct coins, 150 distinct scan timestamps,
  2026-09-01 through 2026-09-07 (~6 days, scans roughly every 30-60 min per D-107's cadence).
- Most coins only appear in a handful of scans (median coin has well under 10 readings) — this is
  a THIN dataset. Every number below should be read with that in mind before anything else.

## Test 1 — scan-to-scan, pooled across all coins (does attention change predict the NEXT scan's price move, or vice versa)
| lag (scans) | attention→price r | n | price→attention r | n |
|---|---|---|---|---|
| +1 | -0.049 | 3226 | +0.018 | 3226 |
| +2 | -0.011 | 2988 | +0.018 | 2988 |
| +3 | -0.020 | 2810 | +0.013 | 2810 |

Both directions are indistinguishable from zero at this timescale. n looks large but is
pseudo-replicated (201 coins contribute repeatedly, not 3226 independent observations) — real
effective sample size is closer to 201. **No usable scan-to-scan signal either direction.**

## Test 2 — day-by-day, per coin per calendar day
| comparison | r | n |
|---|---|---|
| same-day attention level vs same-day return | 0.028 | 922 |
| day-over-day attention CHANGE vs same-day return | 0.110 | 268 |
| day-over-day attention CHANGE vs NEXT-day return | 0.196 | 119 |

The last row is the one that looks interesting — attention rising one day loosely followed by a
better next day (r=0.196, r²≈0.04, so it explains under 4% of next-day price variance even taken
at face value). But n=119 pairs come from only **7 calendar days** and 654 coins, meaning almost no
coin has more than one or two day-over-day comparisons — this is far too little to trust. It is
consistent with a real small effect, and equally consistent with a handful of coins that happened
to pump twice in the same week. Cannot be told apart yet.

## Test 3 — event study: what happens after a scan-over-scan attention spike (weighted mentions ≥2x, ≥5 people)
35 spike events, only **9 distinct coins** — same coin re-triggering repeatedly, not 35 independent
tests.

| horizon | mean return | median return | win rate |
|---|---|---|---|
| +1 scan | -2.5% | +0.6% | 51% |
| +2 scans | -0.6% | -0.3% | 46% |
| +3 scans | +0.8% | +2.4% | 53% |
| +5 scans | +1.6% | +0.7% | 52% |

Baseline (ordinary, non-spike points, same horizons): win rate 38-42%, mean returns +0.5% to +2.3%
(inflated by a few huge pumps in the tail, median close to 0 or slightly negative). Spike events
have a somewhat higher win rate than baseline at every horizon, but with 9 coins behind 35 events
this could easily be 2-3 coins' idiosyncratic behaviour, not a real pattern.

## Test 4 — backtest grid (buy on an attention-spike ratio + minimum crowd size, hold N scans)
Full grid in the script output. The one pattern worth flagging: **when a coin already had a large
crowd talking about it (≥10 people) and then spiked again (≥1.5x), forward returns were
consistently and clearly negative** — roughly -8% to -11% across every hold length tested (n=16-18
trades). That is the opposite of "more attention → buy" — it reads more like "a coin already loud
getting louder is closer to its top than its start," which would fit the reflexive
attention/price literature logged in `70-AREAS/social-collection/README.md` and
`80-WHISPERS/analysis-algorithm/README.md` better than a naive attention-causes-buying story. n=16
is nowhere near enough to act on. Every other cell in the grid is statistical noise around zero.

## Bottom line
- **No reliable lead-lag signal found yet, in either direction, at any timescale tested.** The one
  suggestive pattern (already-loud coins getting louder → negative forward returns) points AWAY
  from "chase rising attention," not toward it, and rests on 16-18 trades — not tradeable, just
  worth re-checking as more data comes in.
- This matches D-123's own falsifier design: it explicitly expected 30 days before judging the
  traction track, and this is 6 days in. Nothing here should move D-123's 2026-10-07 check date
  earlier or later — it's simply too soon to draw a conclusion.
- ! Same caveat as `70-AREAS/social-collection/README.md`'s open line: this checks correlation
  against RAW price only. It does not check whether any of these moves were actually tradeable at
  the size/liquidity/slippage this project cares about (D-113's exitability question) — a coin
  showing a "profitable" attention-spike return on paper may have had $50 of real liquidity behind
  it.
- Re-run this exact script against `data/attention-prices.jsonl` again once D-123's 30-day window
  closes (2026-10-07) — by then there should be 5x the data and the day-by-day test in particular
  will actually be able to say something.

`falsifier: this finding reverses or firms up once attention-prices.jsonl has 30 days of history —
re-run and check both directions again then.`
