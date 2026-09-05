---
id: kb.emerging-signal-backtest
t: kb
v: 1
upd: 2026-09-05
machine: connal
prio: high
---
# DOES "3 CREDIBLE PEOPLE NAMED A COIN" (the "emerging" signal) PREDICT ANYTHING? — T-011, checked

!! First real check of this, using data that already exists: `data/post-facts.jsonl` (19,011 real
posts, 4,391 tagged `kind: emerging` — a person naming a coin by cashtag, not selling it, D-99/D-102)
joined against real price history in `data/candidates.jsonl` + `data/market.jsonl`.

## METHOD
For every ticker named in an `emerging` post, excluded generic/major-asset false positives (`$SOL`,
`$XRP`, `$COIN`, `$AI`, etc. — these are real cashtags but not memecoins this project tracks),
credibility-weighted the distinct authors (same `MIN_SOCIAL_WEIGHTED >= 3` bar `admission.js`
already uses), then found the coin's own real price at the nearest reading within 12h of the FIRST
emerging mention, and ran the same triple-barrier check (`shared/labels.js`: +20%/-15%/24h) forward
from there — no lookahead, only real recorded prices after that point.

## THE RESULT
**23 tickers matched to real price history. 21 resolved (2 still pending): 13 hit target, 8 hit
stop — a 62% hit rate among decisive outcomes.** Some of the wins are large (BIKETYSON +333%,
MAENG +76%, BEN +61%). This is a real improvement over the market-only proxy rule tested 09-02
(`[[trading-strategy/backtest-findings]]`: 11% hit rate, n=11) on the same shape of test.

## WHY THIS IS A HYPOTHESIS, NOT A FINDING TO ACT ON YET
- **n=21 is still below D-05's n>=50 bar.** Same discipline as every other result this week.
- **Real entry-timing bias risk, not yet ruled out**: "entry" is the first price reading available
  AFTER the emerging mention — but if a coin is only added to `candidates.jsonl`/tracked BECAUSE it
  started moving (the screener finding it is itself triggered by volume/liquidity thresholds), the
  first available price could systematically be sampled near a LOCAL LOW, right as a real move was
  already starting — which would inflate a hit rate without the social signal being the actual
  cause. Not measured here; a real fix would need each coin's price at the EXACT mention timestamp,
  not the nearest scan afterward.
- **Extreme individual returns (BIKETYSON +333%) are not independently verified against a second
  price source.** D-117 (decisions.md) already found one real case this project hit where a wrong
  pool gave a fabricated ±70%+ move — a number this large deserves a manual spot-check before it's
  trusted, not automatic belief because the pipeline produced it.
- **No multiple-testing correction applied** (261 tickers cleared the weighted>=3 bar before
  narrowing to the 23 with usable price history — same "count the trials" discipline as the social
  and trend backtests this week, not fully applied here yet).
- ∴ `est:` conf 55% this survives a real out-of-sample check. The live labelled-outcome record
  (`shared/labels.js`, shipped 09-05) is what actually answers this going forward — once n>=50 real
  admissions have resolved, the same 62%-shaped question gets asked with a clean, unbiased entry
  price. This retrospective run is a reason to keep watching, not a number to size a trade on.

## !! MATERIAL CAVEAT ADDED SAME NIGHT — READ THIS BEFORE QUOTING THE 62%
fact @Mongardini & Mei (arXiv 2507.01963, 34,988 tokens): **82.8% of high-return meme coins (>100%
gains) show evidence of artificial growth strategies.** This test counts a +20% move as a "win",
i.e. it samples exactly the population where most large moves are manipulated rather than organic.
∴ a high hit rate here is NOT the same as a high rate of real, tradeable moves.
- Checked directly, not left theoretical: `app/shared/marketmanip.js` (built the same night) flags
  **`cat` — one of the 13 wins above — as +82% price while holder count FELL 7.3%**, the artificial-
  growth shape. At least one win in this sample looks manufactured. Holder data only exists for 27
  of 128 coins, so the others are unchecked, not cleared.
- ∴ the honest reading drops further: 62% of decisive outcomes hit target, on n=21, with an unfixed
  entry-timing bias, in a population where the base rate says most big moves are fake. Treat as a
  reason to keep the live labelled record running, nothing more. Full detail:
  `[[market-manipulation-research]]`.

## SPOT-CHECK, SAME NIGHT: BIKETYSON'S +333% IS REAL, NOT A DATA BUG
Checked `data/candidates.jsonl` directly: price went $0.0004012 → $0.001737 between two consecutive
scans (~14h apart), AND liquidity moved WITH it ($57k → $209k) — the corroborating signal D-117's
real stablecoin-mispricing bug did NOT have (that one showed price spiking while liquidity sat
flat). One spot-check is not proof every number above is clean, but this specific outlier survives
a real check rather than being taken on faith.

## WHAT WOULD MAKE THIS TRUSTWORTHY
1. Re-run once the live labelled-outcome record has real n (no entry-timing bias — labels start
   from `admission.js`'s own real-time entry price).
2. Manually verify the remaining large returns (MAENG, BEN) the same way BIKETYSON was checked.
3. Apply the same multiple-testing count discipline as `[[social-signal-backtest]]`.
