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
safety checks and how much of it could actually be sold before the price caves. It cannot trade —
no wallet keys, no exchange keys, no code path that moves money. Two people, two Macs, kept in
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
- This terminal (Claude Code, this session) has **no macOS accessibility permission** — cannot
  click, type into, or send keystrokes to the running app from outside. Verification of anything
  requiring a real user click/keypress is done by driving it FROM INSIDE the page
  (`element.click()`, synthetic `KeyboardEvent`, `elementFromPoint`) via a temporary env-flag-gated
  probe in `renderer/station/station.js`/`boot.js`, then removed. Screenshots via `screencapture`
  work fine once a permission prompt has been accepted once.
