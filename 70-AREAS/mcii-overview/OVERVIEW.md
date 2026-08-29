---
id: area.overview
t: area-overview
v: 1
upd: 2026-08-29
machine: austin
---
# MCII — WHAT IT ACTUALLY IS, AS BUILT

!! this describes the REAL, CURRENT app. where it disagrees with 20-SPEC (the 08-23 pre-build
plan), this file is right and 20-SPEC is describing something that was never built that way.

## WHAT THIS IS, IN ONE PARAGRAPH
A read-only Electron desktop app that watches a small list of memecoins (and now other tokens on
other chains) and tells Austin and Connal, in plain language, whether each one passes structural
safety checks and how much of it could actually be sold before the price caves. The app itself
holds no keys and has no code path that moves money — but as of 08-29 it EMBEDS the venues' own
pages (see "the venue rooms" below), so trading is reachable from inside the window even though
nothing in this codebase performs it. The old flat claim "it cannot trade" is no longer the whole
truth and was corrected in the footer rather than left standing. Two people, two Macs, kept in
sync by git rather than by a server. An in-app assistant (Orion) reads the vault and the app's live
state and answers questions about it, using the operator's own Claude account, not a metered key.

## THE TWO OPERATORS
- **Austin** — this machine. `s227rbd55v@privaterelay.appleid.com`. Mac. runs the Claude Code CLI
  used to build/fix the app this session.
- **Connal** — the other machine, and the GitHub account the repo lives under
  (`connalhedgcock-design/mcii`). less comfortable in Terminal — `SETUP.md` and `share.sh` exist
  specifically so he never needs to type a git command.
- forecasts/theses are PER-PERSON and never blended (D-79-era decision, `main/journal.js`) — a
  shared Brier score describes neither of you.

## REPO = APP = OBSIDIAN VAULT, ALL ONE FOLDER
`~/Documents/MCII` is simultaneously: a git repo, an Obsidian vault (`.obsidian/` lives here), and
the parent of the Electron app (`app/`). One folder, three identities. Consequences:
- `.obsidian/workspace.json` (which tab you had open) must stay **gitignored** — it changes on
  every click inside Obsidian and was previously tracked, causing false "you have unsaved changes"
  blocks on the sync buttons. fixed 08-28; if it is ever re-tracked, untrack it again.
- `app/node_modules/` must stay out of Obsidian's indexer (`userIgnoreFilters`) or Obsidian chokes.
- !! **the GitHub repo is currently PUBLIC** (`connalhedgcock-design/mcii`), despite `SETUP.md`
  assuming it is private ("It is private, so nothing will work until he does"). checked 08-29,
  confirmed with `gh repo view`. it contains both operators' positions, forecasts and reasoning.
  operator (austin) was told and said "nah its fine for now" — his call, not silently left unsaid.

## HOW THE TWO MACHINES ACTUALLY STAY IN SYNC
Not Syncthing, not Postgres — both were in the original plan (`20-SPEC/arch.md`, `20-SPEC/sync.md`)
and neither is what got built. What's real:
- **git**, full stop. `share.sh` (terminal) and the in-app "Save & share my changes" button both do:
  commit whatever's dirty → `git pull --rebase origin main` → `git push`. "Check for updates" /
  "Up to date" does a fast-forward-only pull and refuses (rather than guessing) if anything local
  is uncommitted.
- a leftover Syncthing folder marker (`.stfolder/`, id `aebms-demgr`, created 08-23) sits in the
  repo root from an earlier plan. Syncthing is **not installed** on Austin's machine and is not
  running anything. it does nothing today; harmless to leave, fine to delete if it bothers anyone.
- `data/*.jsonl` — the SHARED historical record — is written **only** by the hourly GitHub Actions
  cron (`.github/workflows/collect.yml`, `37 * * * *`, i.e. hourly and not on the hour). the app on
  either laptop only ever READS this; nothing local writes to `data/`.
- !! **the app's LIVE state and `data/*.jsonl` are different things and can disagree for up to an
  hour.** a coin added five minutes ago is fully populated on screen and has zero rows in
  `data/market.jsonl` until the next cron run. this is not a bug, but treating the two as the same
  thing IS a bug — see Orion, below, and `70-AREAS/multichain-market-data/`.

## WHERE THE APP'S "RIGHT NOW" ACTUALLY LIVES
`~/Library/Application Support/mcii/snapshot.json` — one JSON file, per machine, **never synced,
not in the repo**. Holds `tokens` (latest full reading per coin), `watchlist`, `positions`,
`windowBounds`, `owner` (local identity, intentionally never synced). This is the "sidecar" the
original spec described; it did NOT become a database or a multi-tier storage system — it's one
file, atomically rewritten (`.tmp` + rename).

## PROCESS MODEL (this part WAS built as specced, and matters)
`app/main/index.js` is the only process that ever touches the network or a secret.
`contextIsolation:true, nodeIntegration:false, sandbox:true`. Renderer talks to main only through
`preload.js`'s narrow, named IPC surface — it cannot make a request or see a key. External links
open in the system browser, never in-app.

## DATA ADAPTERS (`app/main/adapters/`) — READ THIS BEFORE ADDING A CHAIN
| adapter | covers | scope |
|---|---|---|
| `dexscreener.js` | price, mcap, liquidity, volume, 24h change | **multichain** (rewritten 08-29 — see below) |
| `rugcheck.js` | holder count, mint/freeze authority, LP lock, concentration | **Solana only** |
| `jupiter.js` | token metadata + max-sellable-before-5%-slip simulation | **Solana only** |
| `geckoterminal.js` | price history / the chart | **Solana only** (`networks/solana` hardcoded) |
| `onchain.js` | ground-truth holder count computed from-chain, for the cloud collector | Solana |
| `twitterapi.js` | social post collection | chain-agnostic (keyed by CA + search terms) |

`dexscreener.js` was Solana-primary-with-a-fallback-that-never-fired until 08-29: the Solana
endpoint answers `[]` (not an error) for a token on another chain, so the multichain fallback was
unreachable. Fixed — see `70-AREAS/multichain-market-data/`. The other three services are genuinely
Solana-only (no fallback exists to fall through to); `main/index.js` now checks `out.market.chain`
and skips them with an explanation (`out.limited`) rather than emitting three cryptic errors.

## SAFETY + ALERTS + HISTORY
- `shared/safety.js` — `evaluateSafety()` → PASS / CAUTION / FAIL, from mint/freeze authority, LP
  lock status, holder concentration. This verdict is the one thing every card leads with.
- `shared/sanity.js` — physical-plausibility guards (a holder count cannot fall >25%/hr; that's a
  broken feed, not a real exodus) and cross-source disagreement handling (RugCheck vs Jupiter
  holder counts — if they disagree >1.5x, show neither as fact, never average). added 08-28 after
  RugCheck's index reset produced a false "-90% holders" alert on CATE.
- `main/alerts.js` — fires only on a CHANGE vs the previous reading, severity-based cooldown, so a
  standing condition doesn't re-nag every ten minutes.
- `main/history.js` — per-token local jsonl (`userData/history/`) merged with the shared cloud
  record (`data/market.jsonl`, read-only from the app's side).

## THE JOURNAL (`main/journal.js`)
Per-person forecast log (`50-LOG/forecasts-<person>.jsonl`, never one shared file — two people
appending to one file collide on every pull, and a blended Brier score is meaningless). Theses live
as markdown in `40-POS/`. Calibration needs n≥50 before any performance claim is taken seriously.

## THE WATCHLIST
`data/watchlist.json` (shared, in-repo) + `store.watchlist` (per-machine, in the sidecar).
`syncWatchlist()` in `main/index.js` publishes the local watchlist to the repo file on startup and
on every add/remove, so a coin added on one laptop is visible to the hourly cloud collector even if
that laptop is closed by the time the cron runs.

## THE OBSERVATORY
The spatial 3D control-room UI (`renderer/station/`) — full detail in
[[../observatory/README|70-AREAS/observatory/]]. Landing view of the app; the ordinary tabs
(watchlist, market, sector, journal) live behind doors on a turnable ring.

## THE PORTFOLIO + THE VENUE ROOMS (both added 08-29)
- `main/portfolio.js` + `adapters/wallet.js` — what each venue's wallet holds, read from the chain
  with `getTokenAccountsByOwner`. !! BOTH token programs are queried and merged; asking only the
  legacy one returns an empty list that looks exactly like "holds nothing", and CATE is Token-2022.
- both venues are NON-CUSTODIAL, so the positions live in wallets the operators control. That is
  why the portfolio needs no venue login at all: the chain answers "what is in this address" for
  free and cannot break when a venue redesigns. Addresses are PUBLIC and live in the per-machine
  sidecar, never the repo (which is public). No key or seed phrase is accepted anywhere.
- a wallet full of airdropped dust is normal (4,172 mints on the address used to test), so pricing
  batches 30 per dexscreener call, caps the tail, and REPORTS what it skipped.
- ! the value chart is a RECONSTRUCTION: what today's holdings would be worth at past prices, not
  a record of what was held. The chain knows the current balance, never last week's. It says so
  under the chart. `alignSeries()` starts the line where EVERY held coin has a price, so a
  recently-launched coin cannot make the book appear to grow out of nothing.
- 24h P&L is mark-to-market on the current book — not realised, not cost basis.
- `main/venues.js` — fomo.family in a `WebContentsView`. !! NOT an iframe: both venues send
  `x-frame-options` and `frame-ancestors`, and the app's own CSP is `default-src 'none'`. A
  WebContentsView is a real top-level page, so neither policy has to be weakened.
- !! A WebContentsView IS A NATIVE LAYER ABOVE THE DOM. CSS cannot cover it, so leaving the room
  must DETACH it (`venues.hide`) — otherwise a trading terminal paints over the Observatory. Every
  tab click routes through `switchView`, which is where that happens.
- login is the operator's own, on the venue's own page, in a session partition keyed to `owner`
  (`persist:venue-<id>-<owner>`). The app has no login form, never reads a credential field and
  stores no password — the same hand-off shape as Orion with `claude auth login`. OAuth popups are
  allowed (same partition, no node) because Apple/Google sign-in needs them.
- !! AXIOM IS DELIBERATELY NOT EMBEDDED, and this is not a bug awaiting a fix. Measured 08-29 on
  the operator's own URL, same machine, same minute: **Electron's user agent -> HTTP 404
  "RESOURCE NOT FOUND"; a Chrome user agent -> HTTP 200 and the real app.** Axiom's edge is
  refusing embedded browser views on purpose. Wrapping a real trading site in a desktop webview is
  how wallet-drainer and credential-phishing apps are built, so that block is protecting users'
  funds from software shaped exactly like this. Overriding the UA is one line and is NOT done —
  it circumvents an access control the venue chose, likely breaches their terms, and would train
  both operators to trust a trading terminal rendered inside third-party software, which is the
  habit the block exists to prevent. The axiom door opens a real room that says so and launches
  the SYSTEM BROWSER instead. Their Axiom holdings are still read on-chain in the portfolio, which
  needs no login and no embedding at all.
- the venue rooms hide the footer entirely (`display:none`, not `visibility`) — the view fills the
  window down to it, so an invisible footer would still eat that height. ! `.venue-host` must not
  be `flex:1`: that means `flex-basis:0%`, which beats the height JS computes, and the venue gets
  letterboxed into a 320px strip while everything in the DOM looks correct.
- the door ring is now SEVEN doors at 28° spacing. Eight at 24° overlapped by 1px (the same
  failure as six-on-a-five-door ring), and the operator asked for door sizes to be kept, so the
  unbuilt prediction-markets door gave up its slot.

## ORION — the in-app assistant (`main/orion.js`)
Shells out to the **Claude CLI** (`claude -p`), NOT the Anthropic API. !! **no API key exists
anywhere in this project** — whoever is at the machine signs in with their own Claude account
(`claude auth login`), and there is no per-token billing. Runs with `cwd = REPO`, so it can read
the vault directly. As of 08-29 it also receives a compact snapshot of the app's LIVE state (see
"live vs data/*.jsonl" above) alongside every question, because a repo-only view of the world made
it confidently wrong about a coin that was fully populated on screen five minutes after being
added. `main.js` exposes `orion:status` / `orion:ask` / `orion:login` over IPC; readiness is
checked with `claude auth status --json` (costs nothing, no model call) — never inferred from a
credentials file, because on macOS the CLI keeps credentials in the Keychain, not a file.

## THE SYNC BUTTONS (`main/updater.js`)
`checkForUpdates` / `applyUpdate` / `shareChanges`, exposed as the header buttons. This is the
entire "how do two non-experts collaborate on one git repo without ever touching git" answer —
see `main/updater.js`'s own comments and `50-LOG/2026-08-28h-dead-buttons.md` for why the button
looked broken for a while (it wasn't the git logic — `window.prompt()` throws in Electron and was
silently killing the click handler before it ever reached the git code).

## TRAPS FOR A FUTURE SESSION (read before you rediscover these)
- `window.prompt()` **throws** in an Electron renderer. Never use it. Use `askText()`
  (`renderer/app.js`) or the Observatory's own dialog pattern. A thrown exception in a click
  handler produces NO visible error — the button just looks like it did nothing. This exact shape
  of bug (failure indistinguishable from idle) has recurred at least eight times in this project;
  treat any "the button does nothing" report as this first.
- Ticker + name are NOT identity. Copycat tokens reusing both are common
  (`70-AREAS/multichain-market-data/` has the ANSEM case — two tokens both called "The Black Bull",
  one real with 136k holders, one a single-wallet impostor claiming $317M). Always resolve and
  reason from the CONTRACT ADDRESS, never the symbol.
- `transform-style: preserve-3d` on an element makes Chromium hit-test its 3D-rotated children
  against that ancestor — every click on the Observatory's prompt bar was silently swallowed by
  its parent until this was found with `elementFromPoint`, not by reading the CSS.
- A CSS variable that feeds both an element's `width` and `height` must never be a `%` — percentage
  resolves against a different box for each axis and the element renders as an ellipse. Hit this
  twice in the Observatory (the door ring's globe sizing, then the arc-gauge dial).
- A raw `fetch()` with no timeout can hang a whole process forever. Every network call in the
  collector must go through `main/adapters/http.js: getJSON()` (20s timeout, retries, backoff) —
  `onchain.js` was the one exception, calling Solana's RPC directly, and it froze the cloud
  collector for 3h46m on 08-29 when that public endpoint stalled mid-response (D-87). Combined with
  `collect.yml`'s single-run concurrency lock, one hang blocked every hourly trigger behind it —
  see `50-LOG/2026-08-29-scanner-hang.md`. Check any new adapter for this before trusting it.
- A loop that makes several network calls, each individually bounded by `getJSON()`'s default
  timeout/retries, is NOT itself bounded — the per-call budget just multiplies. `jupiter.js:
  maxExitable()` runs a 17-round binary search, one Jupiter call per round; at the default policy
  (3 retries, 20s each) a degraded Jupiter turned one coin's "sellable amount" simulation into a
  ~24-minute wait, which read as the whole app hanging on every launch (08-29,
  `50-LOG/2026-08-29-app-freeze-exit-sim.md`). Any loop of network calls needs its OWN overall
  wall-clock budget and an early exit on repeated failures — the per-call timeout alone is not
  enough once the call happens more than once.
- This terminal (Claude Code, this session) has **no macOS accessibility permission** — cannot
  click, type into, or send keystrokes to the running app from outside. Verification of anything
  requiring a real user click/keypress is done by driving it FROM INSIDE the page
  (`element.click()`, synthetic `KeyboardEvent`, `elementFromPoint`) via a temporary env-flag-gated
  probe in `renderer/station/station.js`/`boot.js`, then removed. Screenshots via `screencapture`
  work fine once a permission prompt has been accepted once.
