---
id: area.observatory.func
t: area-functionality
v: 1
upd: 2026-08-29
machine: austin
---
# THE OBSERVATORY — instruments and elements

Every element below reads from ONE snapshot of ONE fetch (`instruments.js: snapshot()`), so no two
gauges on screen can describe different moments. A board with no data draws its frame and SAYS so —
it never draws an empty gauge, because "could not check" and "nothing there" are different claims.

## THE SIX BOARDS
| board | label | instrument | reads | span |
|---|---|---|---|---|
| universe | THE UNIVERSE | channel strip | every tracked coin's liquidity, ranked, one row each — even a coin with no market data yet gets a row (unlit) | 2 |
| momentum | MOMENTUM | arc gauge | % of tracked coins up in 24h — OR, with a coin selected, that coin's own 24h move on a fixed ±50% scale | 1 |
| flow (liquidity) | LIQUIDITY | odometer + tape | summed liquidity across the watchlist — OR the selected coin's liquidity alone | 1 |
| alerts | CAUTION PANEL | annunciator | one lamp per tracked coin (colour = its safety verdict) + one lamp per upstream feed (dex/rugcheck/jupiter/gecko/cloud) + the signal layer + live CRIT/HIGH alert counts | 2 |
| movers | ATTENTION | sparkline | the selected coin's price trace over the chosen window, or the deepest coin's if none selected | 1 |
| window | WINDOW | rotary selector | 1h / 24h / 7d / 30d — and, beneath the knob, what that window currently yields (reading count, scan count, time since last scan) | 1 |

## THE CAUTION PANEL IS A SELECTOR, NOT JUST A READOUT
Click a coin's lamp in the caution panel → `momentum`, `liquidity` and `attention` all repoint at
that ONE coin, and each renames itself (`MOMENTUM · CATE`) so it's never ambiguous whether a number
describes one coin or the whole book. Click the same lamp again → releases back to the aggregate.
Implemented as `selectedCa` (module state in `station.js`), threaded into `snapshot(windowId,
selectedCa)`, resolved to `snap.selected` (falls back to null if the coin was removed from the
watchlist since selection — never blanks the wall over a stale id).

## THE GLOBE
Raw WebGL2 (`holo-globe.js`), zero dependencies, deliberately NOT three.js. Renders a wireframe
Earth (real coastlines, see below — not noise) with additive blending so the far hemisphere shows
faintly through the near one, a Fresnel edge-glow, a climbing scan band, and imperceptibly-drifting
tilt/spin (sum of irrational-frequency sines, never repeats a pose, capped at ~8% amplitude).
**In the Observatory, the globe IS Orion.** `setState('idle'|'listening'|'working')` — brighter and
faster while a question is in flight. That is the loading indicator; there is no spinner anywhere
in this room, by design.

The land mask is a hand-authored 72×36 five-degree grid of real coastline ranges (not procedural
noise — noise makes "a planet", not "Earth"), bilinearly sampled so the coastline reads as a soft
band rather than an aliased staircase.

## THE DOORS
Six, on a ring (`station-geometry.js: DOORS`), ±75° spread (six doors needed more spread than
Peter's five-door ±62° template — packed at ±62 they'd have physically overlapped on screen; see
LOG.md). Four are built and open onto the app's real tabs (sector/journal/market/watch); two are
sealed (wallets, prediction markets) and render with hazard tape, refusing to open. `↑` on a sealed
door does nothing — it is meant to look deliberately unfinished, not broken.

## THE PROMPT (ORION)
One input, labelled `ORION` — the earlier ask/log mode split was removed per operator request
("just have ask for now... make it talk to orion"). Typed questions go to `main/orion.js` over IPC
(`window.mcii.orionAsk`). While waiting, the reply area cycles through vague-on-purpose waiting
words (`thinking` → `reading the vault` → `checking the record` → `cooking` → …) with a pulsing
dot — Orion genuinely takes ~20-30s reading files, and a static "loading" that long reads as a
hang. The answer, once it arrives, TYPES OUT on an ease-out curve sized to a fixed time budget
(`TYPE_MS`) regardless of length, so a long answer doesn't take a minute to read itself onto screen.
A `log in to anthropic` button appears only when `orion:status` genuinely reports not-ready
(`claude auth status --json`, a real check, costs nothing) — see LOG.md for the three wrong ways
this was checked before that.

## MEASURING, NOT GUESSING — the pattern used throughout this area
Nearly every layout bug in LOG.md was found by adding a temporary, env-flag-gated probe directly
into `station.js`/`boot.js` (`console.warn` dumping `getBoundingClientRect()`, `elementFromPoint()`,
or `scrollHeight` vs `clientHeight`), running the real app, reading the printed numbers, then
DELETING the probe once fixed. This is the standard way to debug this room going forward — a 3D
CSS scene's real screen position cannot be reliably predicted by reading the transform chain.
