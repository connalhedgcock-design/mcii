---
id: log.20260827c
t: log
v: 1
---
# 2026-08-27 UI WIRING + JOURNAL

## OPERATOR CONFUSION — my fault, and diagnostic
- "i am only seeing neegy and cate in the app i need to see every coin"
- ! the scanner had been running for HOURS finding coins with nowhere to display them. 40 social readings, 6 scans, 80 observations — all invisible.
- ∴ lesson: a collector without a surface is indistinguishable from a broken collector, FROM THE OPERATOR'S SIDE.
  I knew the data existed so I didn't feel the gap. they couldn't see it, so for them it didn't exist. build the surface with the collector, not after.

## BUILT — three tabs
1. YOUR COINS — watchlist, live, + new SOCIAL panel per card (people posting / tone / vs-usual / bot% / spam filtered / confidence).
   ! social verdict LEADS with manipulation: manufactured conversation renders as a warning in crit colour, never as enthusiasm.
2. MARKET — every coin the scanner found (10 currently), local + cloud merged, latest obs per token.
   ! sorted by accumulating > persistence > liquidity. NEVER by price change. sorting by price change is how you rebuild a trending list.
   ! header copy states plainly that passing != recommendation, ∵ pump.fun auto-revokes so a clean gate is table stakes (D-33).
   "Track" button adds to watchlist.
3. JOURNAL — calibration (Brier + verdict), forecast entry, open/resolved lists, positions from 40-POS/*.md.

## JOURNAL DESIGN
- theses written as markdown INTO THE VAULT (40-POS/) ∴ they travel with the repo to austin + stay readable outside the app.
- forecasts > 50-LOG/forecasts.jsonl. brier per forecast, rolling mean, baseline 0.25 (always-say-50%), optional market-implied comparison.
- ! calibration verdict is BLUNT BY DESIGN: n<50 = "too few to conclude anything"; brier>0.25 at n>=50 = "no demonstrated edge".
  test asserts the verdict contains no softening words (but/however/still). the whole point is that it can tell them the process doesn't work.

## !! BUG THE TESTS CAUGHT — would have corrupted the one record that must be trustworthy
- forecast ids were `Date.now().toString(36)`. two forecasts created in the same MILLISECOND collided.
- resolveForecast used findIndex > resolved the WRONG forecast, silently. brier computed against a different prediction.
- ✓ id now timestamp + random, uniqueness checked against existing before write.
- ✓ resolveForecast REFUSES on ambiguous id, and refuses double-resolution.
- ✓ regression test: 200 forecasts in a tight loop, all ids unique, resolving hits the intended one.
- ! this is exactly the class of bug the calibration record cannot tolerate — it wouldn't error, it would just quietly score the wrong thing forever.

## TESTS 77 (+15 journal)

## STATE OF DISCOVERY
- 10 coins tracked, 3+ scans each, **0 accumulating**. correct output, not a fault:
  everything the trending feeds surface has already moved (+395%, +11092%, -71%). the accumulation condition requires price NOT to have run.
- ∴ still confirms D-34's underlying worry: the universe is momentum-biased even though the ranking no longer is.
  ? next discovery axis: pull from new_pools by holder-growth rather than trending. needs the geckoterminal throttle to behave.

## 2026-08-28 MULTI-USER JOURNAL — the actual blocker to adding austin
operator asked "should we wait until the app is more set up before putting austin on it?"
answer: polish is NOT the blocker. two structural problems were:

1. !! FORECASTS HAD NO OWNER. austin logging predictions would blend into one Brier with connal's.
   a blended Brier describes NEITHER forecaster — it is precisely the confident-looking meaningless
   number the journal exists to prevent. worse than no score.
2. ! one shared append-only forecasts.jsonl > git conflict on every pull from two writers.

✓ FIX: one file per person, `50-LOG/forecasts-<owner>.jsonl`. same trick already used for positions.
  conflicts impossible BY CONSTRUCTION (single writer per file), and scores are personal by construction.
✓ calibration(owner) REFUSES to score without an owner and says why.
✓ resolveForecast finds which file holds an id rather than guessing ∴ can never resolve another person's forecast.
✓ identity stored in the LOCAL snapshot, never synced — each machine knows only who sits at it. UI asks once.
✓ test proves the property that matters: austin 0.04 (good), connal 0.785 (bad), computed independently, neither contaminated.

TESTS 86.

! GENERAL PATTERN, third instance: adding a second participant broke an invariant a single-user design held silently.
  (1) shared rate limits across app+collector+screener. (2) per-process budget caps summing to 2x. (3) per-person scores blending.
  ∴ before adding ANY second instance of something — process, machine, person — enumerate what the first one was implicitly assuming it was alone in.
