---
id: log.evidence-packet-build-step1-2026-09-07
t: log
v: 1
upd: 2026-09-07
machine: connal
---
# EVIDENCE PACKET + ORION ANALYSIS — BUILD STEP 1

Implements `90-TASKS/TRACKING-BUILD-PLAN.md`'s first build assignment: one coin, one frozen
four-stream evidence packet, one on-demand Orion read of exactly that snapshot.

## RESULT

fact: `app/shared/evidencepacket.js` built — `assemblePacket()` is pure (no fs/network), filters
trades/posts/market/news to `firstObservedTime <= decisionCutoff`, marks suspect prices via the
existing `pricesanity.markSeries` (reused as-is, D-69's "mark, never drop" rule), and computes a
deterministic sha256 hash over the key-sorted evidence fields only. `buildPacket()` is the impure
wrapper: reads `data/notable-posts.jsonl`, `data/candidates.jsonl`, `data/news.jsonl`, the
per-machine `fomo-signals/signals.jsonl`, and fetches (or reuses, for a same-cutoff rebuild) a rug
check. Packets and their Orion analyses save under `<userData>/evidence-packets/<chain>/<ca>/v<N>/`
— private, per-machine, never in the repo, same footing as `fomo-signals/`.

fact: `app/test/evidencepacket.test.js` — 18 checks, covering the five things the build doc asked
for (cutoff leakage, hash reproducibility including a real "later data arrives" replay, identity
collisions between two coins sharing a ticker, missing-data labelling, suspect-price retention)
plus an explicit check that `previousPacketRef`/`version`/`packetId`/`builtAt` never affect the
hash. All pass; wired into `npm test`.

fact: four new IPC handlers in `app/main/index.js` (`evidence:build`, `evidence:latest`,
`evidence:analyze`, `evidence:analyses`) and matching `preload.js` bridge methods. `evidence:analyze`
calls `orion.ask(prompt, null)` — confirmed by reading `orion.js` directly that `null` skips
`liveContext()`, so the frozen packet is never contaminated with today's live prices.

## CORRECTION TO THE BUILD DOC — UI LOCATION

est: the build doc named `app/renderer/station/room-market.js`'s `detailBoard()` as where the
Analyze button goes. Read that file directly: `detailBoard()`'s only action button is `track this`,
and it is rendered ONLY for `!r.onWatchlist` — a coin already tracked shows a static "already yours"
chip with no button slot at all. `room-market.js`'s rows also come from `screen:latest` (shallow
scanner rows: ca/sym/mcap/liq/vol24/chg24), not the full per-coin record (`market`/`safety`/`exit`/
`gate`/`alerts`) evidence analysis actually needs.

`app/renderer/station/room-warroom.js` ("The War Room") is the room actually built for this: it
already loads full tracked-coin records via `getTokens()`, already has a per-coin "bench" with a
verdict/arithmetic/disagreement/blind-spots reading, and its own header literally says its subject
is "why does the app believe that" — which is what an evidence-and-Orion-read board is for. Built
the Analyze button and result board (WAR-7) there instead. Confirmed with a full read of both files
before deciding, not a guess.

est: this is a build-location correction, not a scope change — nothing about the packet, the IPC
shape, or the Orion-null-live rule differs from the doc.

## WHAT'S STILL A CAVEAT (named, not fixed here — later build steps' job per the doc)

- Trades and posts carry no distinct "first observed" time separate from the event's own
  timestamp — `eventTime === firstObservedTime === savedTime` for both streams today. Step 2/4.
- FOMO trades have no transaction signature — `sourceLink: null` for every trade row. Step 2.
- Rug check cannot be replayed for an old cutoff; a same-cutoff rebuild reuses the prior packet's
  frozen reading, a new cutoff always fetches fresh.

## VERIFICATION DONE

- `npm test` — full suite green, 18/18 new checks pass, no existing test broke.
- Syntax-checked `room-warroom.js` (ESM), `main/index.js`, `preload.js` directly with node.
- Not yet done: launching the actual app and clicking Analyze against a real tracked coin (needs
  the Electron app open and Orion signed in) — that verification step from the build doc is still
  open for whoever runs the app next.
