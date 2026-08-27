---
id: log.20260827
t: log
v: 1
---
# 2026-08-27 SCANNER SCHEDULED + STORED (item 1 done)

## ! I HAD THE DEPENDENCY BACKWARDS — corrected before building
- D-34 said: don't schedule the screener until discovery stops being momentum-based.
- WRONG. every non-lagging axis (holder growth, liq building, buy pressure w/o pump) is a RATE, and a rate needs >=2 observations.
  ∴ scheduling+storing is not blocked BY the discovery fix, it is a PREREQUISITE FOR it. you cannot compute growth from one snapshot.
- ∴ built storage first. the good version of discovery only becomes possible once the file has depth.

## BUILT
- main/scanstore.js — one row per (scan, token). trajectories() groups by ca. prune() keeps 7d.
  ! rejection reasons tallied per scan ∵ they describe the MARKET not just the filter. 90%-fail-on-liquidity is a different regime from 90%-fail-on-safety.
- risers(): holderGrowth + liqGrowth vs priceGrowth over a window.
  **accumulating = holders +>5% AND liq +>3% AND price <+15%.** requires price NOT to have run — that's what separates it from every trending list.
  score = (holderGrowth + liqGrowth) / max(|priceGrowth|, 5). ranks on people-arriving-per-price-move, NOT on price.
- main/scanner-daemon.js — standalone, 5min cadence, nohup. ~75 calls/scan vs 10 calls/sec measured headroom.
  ! a failed scan records NOTHING. never a zero row. (fourth time this pattern has mattered.)

## TESTS 62 total (+9 new)
- synthetic 6-scan fixture w/ 3 archetypes: ACCUM (holders+45% liq+50% price+7.5%) | PUMPED (price +450%, holders flat) | FLAT.
- ✓ ACCUM flagged + ranked first. ✓ PUMPED explicitly NOT flagged and scores 0. ✓ token seen once excluded, not guessed.
- ! that PUMPED test is the point of the whole feature: the thing every other screener would put at the top, ours must reject.

## !! PROCESSES DIED OVERNIGHT — the predicted gap, measured
- machine slept > collector AND app both dead by morning. only found because I checked.
- social record: 17 readings, 4 gaps >1.5h, largest **7.8h**.
- ∴ confirms the P2 case concretely: local processes cannot provide continuous coverage. cloud collector is not a nicety.
- ! ALSO: nothing told anyone they were down. need process supervision / restart-on-wake, or move collection off the laptop.

## breadth index NOW LIVE (17 readings > 10 needed): CATE -1.26, NEEGY -1.49.
- ! caveat: baseline is 17 irregular readings w/ 7.8h holes. the number exists; it is not yet trustworthy. do not lean on it.
