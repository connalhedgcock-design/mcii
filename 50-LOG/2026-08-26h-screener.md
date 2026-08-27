---
id: log.20260826h
t: log
v: 1
---
# 2026-08-26 MARKET SCREENER BUILT + RUN (D-17 resolved)
operator: "should not just scan coins we specified — find NEW coins and filter out rug pulls."

## FUNNEL (the D-17 answer)
S0 discover: dexscreener token-profiles/latest (new listings) + token-boosts/top (promoted) + geckoterminal trending_pools. deduped.
S1 cheap bulk (1 call/token): liq>=$25k | age 2h..30d | vol24h>=$50k | txns>=150
S2 safety (1 call/survivor): rugcheck > evaluateSafety + top1<=15% + holders>=300
S3 expensive (jupiter exit sim ~17 calls): survivors ONLY. not yet wired.
- ✓ shared rate limiter per host ∵ app + collector + screener were collectively blowing limits each respected alone.
- ! deliberately skips <2h old. NOT a sniper. being first is a race vs colocated bots, unwinnable from a laptop. our edge is ELIMINATION. see D-20.

## LIVE RESULT: 60 > 15 tradeable > 13 passed safety, 44s, $0.

## !! FINDING 1 — LIQUIDITY IS THE REAL FILTER, NOT SAFETY
- 38/60 rejected on liquidity alone. 4 too new, 3 too old, 2 concentrated.
- ∴ the dominant failure mode of a new memecoin is not theft, it's that you cannot get out. quietest risk, most common.

## !! FINDING 2 — THE SAFETY GATE BARELY DISCRIMINATES ON PUMP.FUN. reframe the product claim.
- only 2/15 failed S2. ∵ pump.fun AUTO-REVOKES mint+freeze on every launch > the classic code-level rug is largely engineered out on this launchpad.
- ∴ "PASSED SAFETY" != "SAFE". it means nobody can steal via smart contract. dev can still dump, liq can still drain over days, coin can still just die.
- ∴ residual risk is BEHAVIOURAL not STRUCTURAL > which is exactly what the recorded-history alerts (exit-drop, liq-drain, holders-falling) exist to catch.
- ! this materially reframes P1's value: the safety gate is table stakes, the HISTORY layer is the differentiator. update the pitch, don't oversell the gate.

## !! FINDING 3 — DISCOVERY VIA "TRENDING" IS STRUCTURALLY LATE
- survivors incl. +841%, +706%, +605%, +585% on 24h. surfacing a coin after it octupled shows where the move ALREADY happened.
- ∵ trending_pools + boosts are both lagging by construction. we filtered for liquidity+safety and got a momentum list.
- ? UNRESOLVED: need a discovery axis that isn't "already moved". candidates: new_pools sorted by holder GROWTH rate, or liq growth vs price flat (accumulation), or our own divergence metric once social history exists.
- ! do NOT ship the screener to operators as an opportunity list until this is fixed. it currently reads as a buy-the-top generator.

## OPS
- ! geckoterminal 429s hard (~30/min) and returns the error INSIDE a 200-shaped body > my parser read it as "0 pools". THIRD false-zero of the day.
  ✓ shared throttle added. ! every adapter must treat a status.error_code body as an error, never as empty data.
- ! check-then-act race: my `until` loop made a probe request then a SECOND fetch which got limited. reuse the probe's response.
