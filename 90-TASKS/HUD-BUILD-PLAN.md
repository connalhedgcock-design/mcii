---
id: task.hud-build-plan
t: build-plan
v: 1
upd: 2026-09-09
machine: connal
status: backend-built-and-live-tested — window-in-running-app NOT yet verified
---
# The live trading HUD — plan + build status

Plan as given by Connal, 2026-09-09 (verbatim, not summarised — see reasoning below for why each
choice was made). This document is the plan AND the build log; status lives at the bottom of each
section rather than in a separate file, so the two never drift apart.

## Context

Connal wants something that sits with him while he's actually executing a trade — not something
he has to alt-tab into MCII to check. Two different jobs were folded into one ask:

1. **Longer-term "narrative" coins** — already covered by `room-watch.js`/`room-story.js`. Nothing
   new needed.
2. **Quick/live trading on new or just-bonding, low-market-cap coins** — the real gap. His own
   words: quickly eliminate coins that look like heavy insider/dev activity, buy ones that look
   legit with a good narrative, buy the dip rather than the top. No screen for this existed.

Scoped as a new capability, not a retrofit — same shape as the War Room and The Story (D-126's
precedent).

## Where it lives: floating always-on-top window, not a browser extension

Decision: an Electron always-on-top window, not a real extension. His trading venues (Axiom,
pump.fun, DexScreener) run in his normal browser; an OS-level always-on-top window floats above
any app including that browser. A real extension would only earn its cost if the HUD had to be
pixel-anchored inside the venue's own chart, which wasn't asked for, and it would trade this
project's proven weak spot (parsing a third-party page that changes without notice — D-60/D-63/
D-85) for a stronger one.

**Built**: `app/main/hud.js` — a frameless, always-on-top `BrowserWindow` ('floating' level), one
window, one pinned coin at a time. Reuses the existing shared `preload.js` unchanged.

## What it shows

### 0. Minute-level candles
**Built and live-verified 2026-09-09**: `geckoterminal.js: fetchRecentMinutes()`. Confirmed live
against a real pool (CATE) — real 1-minute OHLCV rows returned.

### 1. The opening pump/dip/pump shape (Connal's own method, credited as his)
**Built and unit-tested 2026-09-09**: `app/shared/tradepatterns.js` — `detectDevPumpShape()`, plus
`detectNoSellSide()`, `detectSuspiciouslySmooth()`, `detectDeadCoin()`, `dipRead()`, composed by
`analyzeShape()`. 15/15 tests pass (`app/test/tradepatterns.test.js`, wired into `npm test`). Pure
functions, no network — every threshold in `DEFAULTS` is a named, revisable first guess, not a
backtested cutoff, and the code comments say so.

! Real bug caught and fixed during peak-detection design: taking the plain max-high over the whole
"open window" picked up a LATER, taller leg as if it were the first spike when the whole sequence
fit inside one short window. Fixed by tracking the running high and locking in the peak the moment
a real pullback (`peakConfirmPct`) confirms it passed — covered by the "full shape matches" test.

### 2. A genuinely more useful graph
**Built**: HUD reuses `readouts.js: stripChart`/`wireChart` (same chart primitive as the rest of
the app) for price; a liquidity series rides along (`history.js: series(ca, 'liq', ...)`) but is
not yet drawn as a second line on the SAME chart — currently shown as a separate read, not
overlaid. Left as-is for this pass; a real "second line, shared axis" change to `stripChart` itself
was judged out of scope for one session on top of everything else here.

### 3. Top-5-holder wallet forensics
**Built and live-verified 2026-09-09**: `app/main/tradehud.js: topHolderForensics()`.

!! REAL BUG FOUND AND FIXED THE SAME SESSION: RugCheck's `topHolders[].address` is the TOKEN
ACCOUNT, not the wallet — confirmed live by checking five different real top holders of an
established coin (CATE) and getting the exact same 0.00203928 SOL (the SPL token-account
rent-exempt minimum) for all five. `.owner` is the actual wallet. `rugcheck.js` now exposes both,
with the distinction documented in the code; `tradehud.js` uses `owner` only. Re-tested after the
fix with real, differing balances (14.28 / 1.02 / 0.51 / 0.90 / 2.38 SOL) — this would have shipped
a permanently-false "all wallets look the same" read for every coin if not caught.

- Balance diversity: built, live-tested (see above). `walletflow.js: getBalance()` (new, one plain
  `getBalance` RPC call, confirmed live).
- Funding source + funding date clustering: built, reusing `washtrade.js: findFunder()`
  unchanged, now also returning the funding transaction's own `blockTime` (confirmed live it rides
  free on the existing call, no extra RPC) so date-clustering doesn't need a second pass.
- Community/comments check: **spiked live, not automatable today.** `frontend-api-v3.pump.fun`
  has no `/replies/{mint}` or similar endpoint at any guessed path (checked several, all 404/530).
  Stays a manual reminder in the HUD's "the story" section (a link, not an automatic check) — same
  honest fallback the plan itself proposed if this came back unconfirmed.

### 4. Dip-vs-distribution read
**Built and unit-tested**: `tradepatterns.js: dipRead()`, composed with the shape match and
`history.js: delta()` for liquidity/top-10-holder trend.

### 5. Creator wallet's rug history
**Built and live-verified 2026-09-09**, and simpler than planned: the plan expected deriving the
creator/deployer wallet from on-chain pool-creation transactions. Turned out unnecessary — pump.fun's
own `/coins/{mint}` response already carries a `creator` field directly (confirmed live). Finding
the creator's OTHER coins also turned out to have a real, working, undocumented endpoint:
`/coins?creator=<address>&limit=N` (confirmed live — checked it actually filters, not just ignores
the param, against a real creator with 11 coins).

`app/main/tradehud.js: creatorRugHistory()` cross-checks each of a creator's other coins against
this project's OWN recorded signals (`signalstore.js`, new `readForCa()` reads across BOTH
operators' `50-LOG/signals-*.jsonl` files, since that directory is git-shared) for `liq-drain` /
`liquidity-pull` / `safety-flip` / `safety-flip-live`, plus a real recorded liquidity collapse via
`history.js: delta()`. Bounded to 10 other coins checked, same discipline as `washtrade.js`'s own
caps. Labelled "unchecked", never "clean", for a coin MCII never tracked (D-29's rule).

### 6. The coin's own research feed
**Built**: reuses `narrative.js: lookupNarrative()` exactly as `room-story.js` already calls it —
no new spend, no second X search.

## New pieces built

- `app/shared/tradepatterns.js` — new, pure, unit-tested (15/15 passing).
- `app/main/tradehud.js` — new, orchestrates the read described above into one `buildHudRead(ca)`.
- `app/main/hud.js` — new, the floating window itself.
- `app/renderer/hud/{index.html,hud.js,hud.css}` — new, the HUD's own small renderer. Polls
  `tradeHud(ca)` on its own 20s timer while pinned rather than riding the main window's
  `LiveMonitor` — the coins this exists for are often not on the watchlist at all, and
  `LiveMonitor` only ever watches `store.watchlist`. Noted here as a deliberate deviation from the
  plan's literal "wire to the existing onLive/onLiveAlert push" suggestion, not a silent one.
- `geckoterminal.js: fetchRecentMinutes()`, `walletflow.js: getBalance()`,
  `washtrade.js: findFunder()` now returns `ts`, `pumpfun.js: creator` field +
  `fetchCoinsByCreator()`, `rugcheck.js` now exposes `owner` per holder, `signalstore.js:
  readForCa()` — all additive, all live-tested individually against real endpoints before being
  wired together.
- New IPC: `tradehud:build`, `hud:pin`, `hud:unpin` (`preload.js`, `main/index.js`).
- "pin to HUD" button added to `room-watch.js`'s per-coin row and `room-story.js`'s lookup result
  (works for ANY address, not just watchlist coins, matching item 6's reuse of `narrativeLookup`).

## What's verified and what isn't

fact: `buildHudRead()` was run live, end-to-end, against a real coin (CATE) from a plain Node
script (not through the Electron app) — every section returned real data, including catching and
fixing the token-account/owner bug above. `npm test` is green (all 21 suites, 197+ individual
checks including the 15 new ones).

est/NOT YET DONE: the actual floating window has not been seen on screen. Connal's own MCII app
(`/Users/connalhedgcock/Documents/MCII.app`, or the dev `npm start`) was already running live when
this was built — it was not restarted or touched, specifically because a live trading app should
not be yanked out from under someone without asking first (the exact rule `venues.js`'s own header
already states for this project: "Quitting MCII must never yank a trading window away from someone
mid-order"). The window layout, the "pin" button's placement in `room-watch.js`'s row (a second
button added to an existing row — CSS wrapping/overflow not checked visually), and the drag/close
behavior of the frameless window are all unverified in the running app. Next real step: restart
MCII (Connal's call on when) and pin a real bonding coin.

Not built this pass, explicitly out of scope for now: liquidity as a second line on the SAME price
chart (item 2's "concrete graph stuff" version) — a real `stripChart` change, left as a follow-up
rather than rushed alongside everything else here.
