---
id: log.20260829b
t: log
v: 1
prio: high
---
# 2026-08-29 !! THE APP ITSELF FROZE ON EVERY LAUNCH — A 17-ROUND LOOP WITH NO OVERALL BUDGET

## WHAT CONNAL HIT
- "mcii is taking a very long time to refresh" — then, on follow-up: it never finishes, the whole
  window stops responding to clicks, and force-quitting and relaunching does the exact same thing
  every time. Not a slow refresh — an apparent hang, reproducible on every launch.

## ROOT CAUSE
- `main/adapters/jupiter.js: maxExitable()` — the "simulating a real sale" step, run for every
  watchlist coin on every load — does a **17-round binary search**, one Jupiter quote call per
  round, to find how much of a coin can be sold before a 5% price move.
- Each round's call went through the shared `getJSON()` wrapper with its DEFAULT policy: 3 retries,
  20s timeout each. That policy is right for a one-shot "this must succeed" call. It is wrong for
  one disposable sample inside a 17-sample search — the search itself is where the resilience
  should live, not each individual probe.
- Worst case, with Jupiter's quote endpoint degraded or rate-limited: one round could cost up to
  ~85s (20s × up to 4 attempts + backoff). **17 rounds × 85s ≈ 24 minutes, for ONE coin**, before
  `loadToken()` for that coin could even finish — and the watchlist now has 3 coins, loaded
  serially. The whole thing is technically bounded (binary search is finite), which is exactly why
  it never *looked* infinite in the code, but it was easily long enough that force-quitting before
  it finished was the only thing Connal could observe — indistinguishable from a real hang.
- Compounding: `ipcMain.handle('tokens:list', ...)`'s "first run / newly added coin" branch had no
  try/catch around its per-token loop, unlike the other two loops in the same file
  (`refreshAllTokens`, `startAutoRefresh`). Not the cause of this specific freeze (`loadToken()`
  already catches per-field internally), but the same shape of bug that has recurred before —
  fixed alongside this so it can't cause the next one.

## FIX
- `priceImpact()` (the per-round Jupiter call) now passes `{ retries: 0, timeoutMs: 6000 }` instead
  of the default — one fast attempt, not up to four slow ones. A single sample failing just costs
  that sample; the search adapts around it.
- `maxExitable()` now carries an explicit **12-second wall-clock budget** across the whole 17-round
  search, checked before every round, and breaks early after **3 consecutive failures** (Jupiter is
  down for this token right now; round 12 will not learn anything round 3 didn't). Either exit
  returns whatever was found so far — a partial, possibly less precise sellable-amount figure,
  never a block. Matches this project's standing rule: return a partial or null answer, never
  fabricate, never hang.
- `tokens:list`'s per-token loop wrapped in try/catch, matching the other two loops in the file.

## WHY THIS TOOK ASKING, NOT GUESSING
First report ("taking a very long time") was consistent with several different causes — a bigger
watchlist, the deliberately-serial per-token loading, or something genuinely stuck. Asked how long
and whether it ever finished before touching code; the answer ("never finishes, same on every
relaunch") pointed straight at something with runaway worst-case cost rather than ordinary
slowness, which is what led to `maxExitable()`'s unbounded loop rather than the serial-loading
design (deliberate, documented, and not actually the problem here).

## TESTS
No existing adapter-level test mocks network calls (none of `dexscreener.js`/`rugcheck.js`/
`jupiter.js` have a dedicated test file) — consistent with how the rest of this codebase verifies
adapter fixes: reasoned from the code and the failure's own shape, not a mocked unit test. Full
suite (all files) still green after the change.
