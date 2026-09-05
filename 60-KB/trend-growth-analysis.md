---
id: kb.trend-growth-analysis
t: kb
v: 1
upd: 2026-09-05
machine: connal
prio: high
---
# PRICE UPTICK vs REAL GROWTH — does it coincide with holders, market cap, or nothing?

!! run 2026-09-05, on Connal's direct question: "analysis of when uptick in trend coincides with
growth and analysis into what type of growth that is -- is that holders growth, is that market cap
growth, or is there no connection at all." Real answer, from real recorded history
(`data/market.jsonl`, up to 298 readings per coin), not a guess. Tool: `app/tools/backtest-trend-growth.py`, rerunnable any time, stdlib only (no scipy/numpy on this machine, checked).

## WHAT WAS ACTUALLY TESTED
For each coin with enough history, every reading-to-reading price move was paired with the SAME
window's move in holder count, then correlated (Pearson) -- **per coin, never pooled**, for the
exact reason `[[social-signal-backtest]]` found the same night: pooling different coins into one
number can flip a real per-coin relationship's direction entirely. Market cap was not tested
separately from price -- market cap is price times supply, and supply barely moves for these coins,
so the two are almost the same measurement; the real question is what price does WITH holders,
which market cap alone cannot answer.

## THE RESULT, PER COIN — worst first, most data first
| coin | readings | r(price, holders) | reads as |
|---|---|---|---|
| CATE | 298 (291 usable pairs) | +0.22 | price moves WITH holder count — real people joining, not just re-pricing |
| DOGE-1 | 243 (242 pairs) | +0.26 | same — WITH holder count |
| ANSEM | 145 (144 pairs) | +0.05 | no reliable link either way |
| LaPeace | 60 (59 pairs) | **−0.45** | price rising while holders FALL — concentration/speculation shape, not adoption |
| fone | 36 (35 pairs) | +0.10 | no reliable link |
| CASHCAT, BONER, microduck | — | no holder data collected for these (chain not covered) | can't say |

∴ **there is no single answer — it genuinely differs per coin**, which is itself the finding.
CATE and DOGE-1 (this project's two longest-tracked, still-held coins) show real people joining as
price rises. LaPeace — a coin later removed from the watchlist — shows the opposite: price went up
while holders left, the shape of a shrinking group re-pricing the same coin among themselves, not
growth. Also checked: the biggest holder's OWN share (`top1`) moves AGAINST price on 4 of 5 coins
with data (strongest on LaPeace, r=−0.96, and DOGE-1, r=−0.87) — meaning price rises mostly come
with the top holder's SHARE shrinking (new, smaller holders diluting it), not the top holder
buying more. That is a second, independent piece of evidence pointing the same direction as the
holders-count read for those coins.

## WHY THIS CANNOT BE TREATED AS A RULE YET
- Same watchlist-bias caveat as `[[backtest-findings]]`: these are the ~8 coins ever hand-added to
  this project, not a random sample of memecoins. A finding here says something real about THESE
  coins, not about memecoins in general.
- Same autocorrelation caveat as `[[social-signal-backtest]]`: readings 30-60 minutes apart are not
  independent, so the true sample size behind each n above is smaller than it looks. Read every
  number here as "did not obviously fail," not "confirmed."
- LaPeace's n=59 is on the thin side; CATE and DOGE-1's results are the ones with enough history to
  take seriously.

## WHAT THIS IS WORTH RIGHT NOW
`est:` conf 55% that "price up + holders up together" vs "price up + holders flat/down" is a real,
useful distinction for THIS project's coins specifically — not proven, but backed by two consistent
readings (holder count AND top1 share) pointing the same way on the two best-tracked coins.
Falsifier: if a coin later shows strong price-with-holders correlation and then rugs anyway (or the
reverse — strong price-against-holders and it keeps running fine), the distinction is decoration,
not signal. Nothing here feeds `admission.js` yet — same discipline as the social findings: a
promising per-coin read earns a place in the SCORE only after it survives more data, not on its
first real run.

## SOURCES / METHOD
- Pearson correlation + Fisher-z significance threshold, stdlib only — same method as
  `[[social-signal-backtest]]`, for direct comparability.
- `app/tools/backtest-trend-growth.py` — rerun any time as more history accumulates.
