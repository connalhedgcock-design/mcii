---
id: log.story-room-narrative-tracking-2026-09-09b
t: log
v: 1
upd: 2026-09-09
machine: connal
---
# THE STORY — extended to answer "how do I track any memecoin's narrative" — BUILD

Follow-up to `50-LOG/2026-09-09-the-story-room.md` (the one-off address-paste lookup). Connal used
it, then asked how to find a memecoin's narrative *in general*, pasted a Google AI Mode research
blueprint on the topic, and asked for real research (not just repeating the blueprint) via plan
mode. Full plan: `~/.claude/plans/adaptive-hatching-hopcroft.md`.

## WHAT GOT CHECKED FIRST, AGAINST THE BLUEPRINT'S OWN IDEAS

- **"Search the ticker on X, see what KOLs say"** — this exact mechanism was already built, then
  ripped out by Connal's own direct instruction (D-121/D-122/D-123, 09-07: "we decided to rip out
  social mostly"). Not rebuilt. The named-notable-accounts + traction tracks already cover its
  legitimate half.
- **"Read Telegram/Discord chat"** — no free API for private groups; would cost real money or
  require manually joining every group, and would reintroduce the same broad, hard-to-audit
  sentiment problem in a worse-audited form. Not built.
- **"Identify the meta"** — checked the vault: never built or rejected. The closest thing,
  `sector.js`, measures market-wide chatter breadth, not per-coin theme. One open, unbuilt whisper
  (`80-WHISPERS/INBOX-connal.md` L59-64, "does attention rotate between sectors... social market
  cap?") is a bigger, cross-coin version of this idea — deliberately NOT built here, flagged as
  separate future work, since scoring across coins is exactly the kind of pooling
  `social-signal-backtest.md` already showed flips sign.
- **"Check BubbleMaps for holder concentration"** — the underlying number was already being
  collected for free (`history.js: record()` writes `top1`/`top10` into every tracked coin's
  history) and simply never displayed. No need to pay for a third party to re-derive data already
  owned.
- **"Check the project's own DEX Screener page"** — genuinely new and free: `dexscreener.js`'s
  response already carries `info.websites`/`info.socials`, and `fetchMarket()` was fetching and
  discarding it.

## WHAT GOT BUILT

1. **`syncWatchlist()` bug fix** (`app/main/index.js`) — found while checking whether a new field
   would even survive a save. It rebuilt every shared watchlist entry as `{ca, sym, nick}` ONLY,
   silently dropping anything else. Confirmed in git history: `git log -p -- data/watchlist.json`
   shows DOGE-1's `newsQuery` added, then wiped by exactly this code path on a later save. Fixed
   by spreading the existing shared entry first. Verified with a standalone simulation of the
   merge logic, both the bug case (a field with no local counterpart, e.g. `newsQuery`) and the
   real usage case (a field just set locally, e.g. `meta`) — both now survive.
2. **DexScreener's own project info surfaced** — `fetchMarket()` now returns `info` (website/social
   links), threaded through `narrative.js` and shown in `room-story.js` as "what the project says
   about itself," explicitly not verified.
3. **Holder concentration shown, for coins already tracked** — `room-story.js` checks
   `cachedTokens()` for a match, and if found, calls the already-exposed
   `window.mcii.historySeries(ca, 'top1'|'top10', 30)` — zero new backend code — and shows
   current top1%/top10% plus a plain rising/falling/steady read over 30 days. Not shown for an
   address that isn't already tracked; the room says so rather than faking it.
4. **A human-set "meta" tag** — `watchlist:setMeta` IPC handler (mirrors `watchlist:rename`
   exactly), a new `meta` field on watchlist entries (capped 40 chars), edited in `room-story.js`
   via the existing `askText()` modal. Purely descriptive — never scored, never compared across
   coins.
5. **Every lookup recorded as a discrete signal** — `narrative.js` now calls
   `signalstore.record({kind: 'narrative-lookup', ...})` after each lookup. Not wired into
   `admission.js`/`synthesis.js` — a name match stays unconfirmed evidence, same discipline as
   `collectSelfNameNews`. Confirmed live: a real lookup on Catecoin wrote a real row to
   `50-LOG/signals-<machine>.jsonl`.

## VERIFIED

`npm test`: 330 passed, 0 failed, before and after. Live: `lookupNarrative()` on Catecoin now
returns real `info.websites`/`socials` (cate.meme, its Telegram/X). `syncWatchlist`'s merge logic
checked standalone against both the confirmed bug case and the real usage case. Signal write
confirmed by reading the actual appended line back from disk.

! NOT verified inside the real Electron shell, same limitation as the first Story build — this
sandbox can't open the app window. Worth a real click-through, including actually setting a meta
tag and confirming it's still there after the app restarts, next time it's open on a machine that
can run it.
