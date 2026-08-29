---
id: log.20260829c
t: log
v: 1
prio: med
---
# 2026-08-29 LOADING WAS FULLY SEQUENTIAL, TWICE OVER — FIXED BOTH LAYERS

## WHAT CONNAL ASKED
"mcii loads the information for each coin very slowly... im worried when i start tracking more
coins it will be too slow to be effective find a faster way to load it" — a forward-looking
scalability concern, not a one-off report.

## WHAT WAS ACTUALLY HAPPENING — two separate layers of serialization, both real
1. **Within one coin.** `loadToken()` awaited five network calls one after another: market, safety,
   token details, exit simulation, price history. Only market genuinely has to go first (it's what
   tells the rest of the calls which chain the coin is even on) — safety, token details, and price
   history don't depend on each other at all, and exit simulation only needs market + token details,
   not safety or history. All five were waiting on each other anyway.
2. **Across coins.** `main/index.js` had three separate places (`refreshAllTokens`,
   `tokens:list`'s first-run path, `startAutoRefresh`'s slow pass) that loaded the watchlist with a
   plain `for` loop — one coin's full load, THEN the next. Documented as "sequential on purpose" for
   rate-limit reasons, but that reasoning was really about avoiding two separate PROCESSES treating
   themselves as the only caller (the cloud collector + local app), not about coins within one call
   needing to queue behind each other.

Combined: total load time was roughly (5 calls × N coins), fully serial. Adding a coin didn't cost
one coin's worth of time -- it cost one coin's worth of time *for every future load*, forever, and
that scales exactly the way Connal was worried about.

## FIX
- `loadToken()`: safety, token details, and price history are now fired together (not awaited one
  at a time) as soon as market/chain is known. Exit simulation starts as soon as token details +
  market are back specifically, rather than waiting for safety or history too, since it needs
  neither of them. Per-coin latency is now roughly the SLOWEST of those calls plus exit-sim's own
  (already bounded, see `2026-08-29-app-freeze-exit-sim.md`) budget, not the SUM of all five.
- Added `loadTokensBounded()`: loads the watchlist with **bounded concurrency (3 at a time)**, not
  fully serial and not fully parallel. Fully parallel was considered and rejected: `maxExitable()`
  already deliberately throttles its own 17-round Jupiter search ("stay well inside Jupiter's
  free-tier limits") -- N coins all running that search at once would multiply the actual request
  rate against Jupiter by watchlist size, undoing that throttle on purpose. 3-at-a-time keeps the
  real, stated rate-limit concern intact while still meaning a growing watchlist adds roughly
  1/3 as much serial wait as before, not a full coin's worth each.
- All three call sites (`refreshAllTokens`, `tokens:list`, `startAutoRefresh`) now go through the
  same `loadTokensBounded()` helper instead of their own copy of the loop.

## TESTS
Full suite green (all files, no failures) after the change. No dedicated test for the concurrency
behavior itself -- consistent with how this codebase already treats the adapter/loading layer
(reasoned from the code, verified by the existing suite not regressing), same as the exit-sim fix
and the scanner-hang fix earlier the same day.
