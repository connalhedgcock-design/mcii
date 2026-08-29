---
id: area.observatory.log
t: area-log
v: 1
upd: 2026-08-29
machine: austin
---
# THE OBSERVATORY — build + bug log (append-only)

!! same rules as 50-LOG: never delete an entry, quote the operator verbatim, log root cause not
symptom. this file exists because 50-LOG scatters "everything about the Observatory" across many
dated files; this is all of it, in one place, in order.

## 2026-08-29 — 0. THE BUILD, GATES 1–5
- source: `MCII-Spatial-UI-Handoff.md`, a design doc from Austin's friend Peter (his own project,
  "Daedalus," ported to MCII's cold space-station register).
- operator answers, before any code: doors = the four existing tabs + two SEALED (wallets,
  prediction markets); globe = linked to Orion/Claude, not decoration or geography; room name =
  "The Observatory"; prompt = wired fully, no placeholder. then: "build everything you can in this
  session" — cut the remaining Q&A short, proceeded to build against the answers already given.
- built in one pass: `station.css` (stage/beyond/floor/ceiling/canopy/doors/sill/instruments),
  `station-geometry.js` (pure functions — door ring math, board layout), `holo-globe.js` (raw
  WebGL2, additive blend, Fresnel, noise-based landmass — replaced later, see #4), `instruments.js`
  (six board renderers), `station.js` (mount, turning, walking, keyboard, Orion wiring), `boot.js`
  (the one seam into `app.js` — clicks the app's own tab buttons, never touches its internals).
  wired in as a new "The Observatory" tab, scaffolding, alongside the existing tab bar.
- ! added renderer console/error forwarding to the terminal (`main/index.js`,
  `webContents.on('console-message'...)`) at the same time. this became THE highest-value tool for
  the rest of this log — nearly every bug below was found by reading a thrown error in the
  terminal, not by staring at the screen.

## 2026-08-29 — 1. FOUR BUGS FROM THE FIRST LIVE RUN (found via the new error forwarding)
- `render()` set `state.className = 'st-sill-go'` wholesale, stripping the `st-sill-state` hook
  class off the element. the NEXT `render()` call couldn't find it, threw, and the whole sill froze
  after the first turn. **root cause: overwriting a class attribute that also serves as a query
  hook.** fix: `className = 'st-sill-state ' + (...)`, never a bare replace.
- board headline number rendered underneath its own placard (`MKT-1` tag), both unreadable — the
  placard is absolutely positioned in the same corner the headline text flows into. fix: reserve
  padding-right on the header for the placard's width.
- channel strip used `justify-content: space-between`; correct for 7 rows, flung two rows to
  opposite ends of a tall board when the watchlist only had 2-3 coins. fix: `flex-start` + fixed
  gap + a summary block that fills the remaining space instead of stretching rows apart.
- the `SYS` notice placard overlapped the momentum board. fix: centred it in the open floor between
  the two columns instead of pinned to the left edge.
- tests: `app/test/station.test.js` created this session, 22 passing.

## 2026-08-29 — 2. SIX BOARDS SHOWED AS THREE
- symptom: `boardsFor(h)` correctly returns all six boards on paper, but only three ever rendered.
- root cause: the stage height was measured against the WINDOW, and the app's own tab bar (still
  visible behind/above the Observatory as scaffolding) was eating ~88px — enough to cross
  `BOARDS_MIN_ROOM` and silently drop to the 3-board fallback.
- fix: the tab bar is HIDDEN while inside the room (it is, after all, the thing the room replaces)
  and `measure()` reads whichever chrome is actually visible (`.tabs, .bar` filtered by
  `offsetParent !== null`) rather than assuming a constant.

## 2026-08-29 — 3. THE GLOBE WAS OFF-CENTRE, AND SQUARE-CLIPPED WHEN IT BREATHED
- operator: "the globe is not centered witht he doors... whenever the globe breathes the edges of
  the sphere are not visible" (a flat edge appearing around a round object every few seconds).
- measured every relevant element's screen centre with `getBoundingClientRect()` rather than
  guessing: bridge/hub/arch/cone all sat at x=735. **the `<canvas>` sat at x=644.6** — exactly 45%
  of the globe's own width to the left.
- root cause: `mountGlobe()` set `canvas.style.width = '100%'` INLINE. the host stylesheet
  deliberately oversizes the canvas (`inset:-45%; width:190%`) so the atmosphere shell and the
  breathing limb are never clipped — but the inline `width:100%` beat that rule while the
  stylesheet's `left:-45%` still applied. net effect: canvas stayed its ORIGINAL size (hence the
  square clip on breathe) AND was shifted left by 45% of it (hence off-centre). one line, two bugs.
- fix: removed all inline canvas sizing; sizing belongs to the stylesheet alone.
- consequence, introduced by the fix: with the canvas now genuinely 190% size, the sphere GREW to
  fill it — the margin became scale. fixed by deriving the camera distance from the measured
  canvas/host width ratio on every `resize()`, so the sphere always lands at the host element's own
  size regardless of how much oversized margin the canvas carries.

## 2026-08-29 — 4. THE GLOBE WAS "SOME RANDOM PLANET," NOT EARTH
- operator: "the globe should also be the earth not some random planet."
- original landmass was `fbm()` noise, thresholded — reads as "a planet," never as THIS planet.
- attempt 1: continents as lat/lon ellipses. rendered as an ASCII grid before touching the shader
  (cheap way to check a coastline actually looks like Earth) — result: North America fused to
  Eurasia, South America fused to Africa. ellipses are the wrong primitive for coastlines.
- attempt 2: hand-authored a 72-column × 36-row (5°) grid of real coastline RANGES, one row of
  column-spans at a time, checked against the same ASCII render before shipping. this one reads as
  Earth — open Atlantic, tapering Americas, Australia bottom-right. bilinearly sampled in the
  shader so the coastline is a soft band, not a staircase.

## 2026-08-29 — 5. SIX DOORS ON A RING SIZED FOR FIVE OVERLAPPED
- operator: "the doors overlap on eachother. keep their same sizes previously and keep the size of
  the globe."
- context: the globe had been enlarged (operator: "globe should also be bigger") which had also
  widened the doors to keep the arch framing the sphere (620px doors, ring spread unchanged at
  Peter's original ±62°, which was speced for FIVE doors).
- root cause: at six doors across ±62°, neighbouring arches projected 197px apart on screen while
  each one rendered 201px wide — every door overlapped its neighbour, and this had nothing to do
  with the earlier door-width change; it was already latent at the original 420px width too, just
  not asked about yet.
- fix: doors restored to their original 420px/560px box (operator's actual ask). ring spread
  widened to ±75° (30° between each of six doors — Peter's ±62 was correct for five). the
  globe-vs-door relationship, previously a comment, is now a real function
  (`doorScreenWidth()`, `GLOBE_MAX_OF_DOOR = 1.0`) and a real test (`tightestDoorGap()` >
  `doorScreenWidth()`, at every heading) — so this cannot silently regress again when either number
  changes later.
- tests: 23 → 24 passing (`neighbouring doors never overlap, at any heading`).

## 2026-08-29 — 6. THE GLOBE STILL HUNG BELOW THE DOORWAY (vertical only)
- horizontal centring fixed in #3; vertical was still a guessed CSS percentage (`top: 46%`) on a
  flex column containing BOTH the globe and the prompt — which centres the PAIR, landing the globe
  above its target and the prompt below its target, neither on the doorway.
- fix: `.st-hub` restructured from a centred flex column to a full-bleed, non-interactive layer;
  the globe and the projector are each independently, absolutely positioned using coordinates
  MEASURED from `.st-portal.is-facing .st-portal-arch`'s real `getBoundingClientRect()` in
  `measure()`. the doorway is a 3D projection — any constant here is only correct at one window
  height; reading the rendered box is the only thing that stays true as height changes.

## 2026-08-29 — 7. "LOG IN TO ANTHROPIC" DID NOTHING — HIGHLIGHTED ITS OWN LABEL
- operator: "i clicked it and it had a button animation. but it led me nowhere."
- probed with `document.elementFromPoint()` at the centre of the button, the input, and the pane —
  **all three resolved to `.st-projector`, the grandparent**, not to themselves.
- root cause: `.st-projector` carried `transform-style: preserve-3d`. Chromium hit-tests a
  3D-rotated child against the ancestor that declared `preserve-3d` rather than the child itself —
  so every click on the console was silently captured by its own parent. this also meant the TEXT
  INPUT had never worked either; nothing in that bar had ever been clickable.
- fix: removed `preserve-3d` from `.st-projector`. cost nothing — the pane is the only 3D child and
  has none of its own, so there was nothing to flatten that needed the property.
- consequence: moving the prompt down to clear the door plates (operator ask, see #8) took it off
  the bright doorway backdrop onto dark floor; raised the pane's background opacity so it stayed
  legible there.

## 2026-08-29 — 8. THE PROMPT OVERLAPPED THE DOOR-NAME PLATES
- operator: "can you make the textbox slightly lower so it does not overlap with the names of the
  doors."
- fix: `measure()` now also reads every visible `.st-portal-plate`'s bottom edge and places the
  projector at `max(globe-bottom + gap, lowest-plate-bottom + gap)`, clamped so it can never
  collide with the sill either. measured, not a second guessed constant.

## 2026-08-29 — 9. LOGIN: "COULD NOT OPEN A TERMINAL"
- operator ran it, got a failure opening Terminal at all.
- root cause: the AppleScript command was built as
  `` `tell application "Terminal" to do script "${JSON.stringify(REPO)}..."}` `` — `JSON.stringify`
  produces a string WITH ITS OWN DOUBLE QUOTES, nested unescaped inside the outer `do script "..."`
  string. syntactically broken AppleScript, every single time, which surfaced as a generic
  "could not open a terminal" that read like a permissions problem and was not one.
- fix: proper escaping (`shQuote()` for the shell command, real AppleScript string-escaping for the
  `do script` argument), and switched to the CLI's own `claude auth login` subcommand instead of
  trying to type `/login` into a bare `claude` session non-interactively.

## 2026-08-29 — 10. SIGNED IN VIA TERMINAL, APP STILL SAID "NOT SIGNED IN"
- operator: "i logged into antrhopic with my account i restarted the app and i was not logged in
  why?"
- root cause #1 (original design): readiness was inferred from a credentials FILE
  (`~/.claude/credentials.json`-shaped paths). macOS keeps Claude CLI credentials in the **Keychain**,
  not a file — so this check would report "not signed in" forever, on every machine, regardless of
  actual state.
- root cause #2 (introduced fixing #1, same day): rather than find a real check, the UI was changed
  to show the button by default every launch and only hide it after a successful ask — which is
  indistinguishable from "you are logged out" for someone who is already logged in. this is exactly
  what the operator hit.
- real fix: `claude auth status --json` is a documented subcommand, costs nothing (no model call,
  no network beyond the local check), and returns ground truth: `{loggedIn, authMethod, email}`.
  `main/orion.js: status()` now uses it directly; the renderer trusts the answer instead of
  maintaining its own guess.
- separately discovered while debugging this: the Claude CLI itself was **not fully installed** on
  Austin's machine (`claude native binary not installed... postinstall did not run`). fixed by
  running `node install.cjs` inside the global npm package directly — a machine problem, not an
  app problem, but it was blocking every test of this feature until found.

## 2026-08-29 — 11. FIRST REAL ORION CALL WOULD HAVE CRASHED
- end-to-end-tested `orion.ask()` from a bare node script (no UI click access this session — see
  `70-AREAS/mcii-overview/OVERVIEW.md`'s "traps" section) specifically so a real failure would
  surface before the operator hit it.
- it did: `ReferenceError: NOT_SIGNED_IN is not defined`. an earlier edit had replaced the block
  containing that constant's declaration without preserving it — invisible in review because it
  only throws on the code path a real ask takes, never on `status()`.
- fix: restored the constant. re-ran the same end-to-end test; got a correct answer, sourced from
  `data/watchlist.json`, confirming the whole chain (CLI → repo access → reply) genuinely works.

## 2026-08-29 — 12. TYPING / THINKING ANIMATION, AND CAUTION-PANEL SELECTION
- operator: "add a typing animation so when it types out i can see that live as well as the
  'thinking, meandering, cooking' things with an animation when its thinking... i want to be able
  to select a coin on the caution panel and the other panels show data based on the coin i select."
- built both; verified LIVE, not by reading the code, since this session cannot click:
  - thinking state: fired a real question via a synthetic `KeyboardEvent`, polled
    `reply.className`/`textContent` at intervals. captured timeline: `1.2s: "thinking"` →
    `3.5s: "reading the vault"` → `9s: "cooking"` → `20s: "still going"` → `34s`: the typed answer.
  - selection: fired real `.click()` on a caution-panel lamp from inside the page, diffed each
    board's header text before/after. confirmed: `momentum | liquidity | attention · ANSEM` (the
    resting default) → clicking CATE's lamp → `momentum · CATE | liquidity · CATE | attention ·
    CATE` → clicking it again released back to the aggregate.
- `selectedCa` (module state) threads through `snapshot()` → `snap.selected`; boards that follow it
  RENAME themselves (`ATTENTION · CATE`) so a reading is never ambiguous about scope.

## 2026-08-29 — 13. SIDE PANEL REMOVED
- operator: "remove that side panel that brings you to the observatory as there is a button on the
  top bar that does the same and that thing on the side is just ugly and takes up space."
- removed `backBtn()` entirely; `Esc` still walks back to the room from any flat view, and the tab
  bar's own "The Observatory" tab was already the primary way back.

## 2026-08-29 — 14. THE MOMENTUM (AND LIQUIDITY) BOARD WAS CLIPPED
- operator: "slight zoom out that momentum panel see how it kinda gets cut off."
- measured with `scrollHeight` vs `clientHeight` on every board body rather than eyeballing:
  momentum clipped by 17px, liquidity's odometer+tape clipped by 7px. both span-1 boards where a
  fixed-size instrument was taller than the panel actually available at this window height.
- first fix attempt: `--arc-d: clamp(52px, calc(100% - 46px), 86px)`. **this rendered the dial as
  an ELLIPSE** — the exact failure Peter's handoff documents by name: one CSS variable feeding both
  `width` and `height`, where a `%` resolves against the parent's WIDTH for one axis and its HEIGHT
  for the other. caught by screenshot, not assumed fixed just because the clip test passed.
- real fix: dial diameter computed in real pixels in JS (`fitArcs()`, reads the actual panel
  `clientHeight`, clamped 52–86px), never a CSS percentage. same fix applied to the liquidity tape's
  height. verified at the default window size and at a deliberately short one (1280×640): all six
  boards report `ok` at both.

## 2026-08-29 — 15. ORION COULDN'T SEE WHAT THE APP WAS SHOWING RIGHT NOW
- operator, after Orion said "CASHCAT and ANSEM have no market data": "theres data for ansem in the
  your coins tabs. are you not able to access that??"
- root cause (Observatory-facing half; the ANSEM/CASHCAT investigation itself is logged in
  `70-AREAS/multichain-market-data/LOG.md`): Orion runs with `cwd = REPO` and can only read
  `data/*.jsonl` — the SHARED record, written hourly by the cloud collector. the app's actual
  on-screen state lives in `~/Library/Application Support/mcii/snapshot.json`, which is per-machine
  and never touches the repo. a coin added minutes ago is fully populated on screen and has zero
  rows in the shared record — Orion was being truthful about the repo and wrong about the app.
- fix: `main/index.js: liveContext()` builds a compact one-line-per-coin summary of the live
  sidecar state (price/mcap/liquidity/24h/holders/safety verdict/sellable-before-5%/position) plus
  active alerts, and it is now passed into every `orion.ask()` call as a `<live-readings>` block.
  Orion's system prompt was updated to prefer that block over the repo files when they disagree,
  and to say the record hasn't caught up rather than reporting "no data."
- re-ran the exact question that failed before, after the fix: correct answer, correctly flagged
  ANSEM's concentration risk unprompted, using the live block.

## OPEN, NOT YET DONE
- gate 7 (acceptance pass, four window sizes, formal checklist) has not been run end-to-end.
- arrow-key turning and walking through a door are built and exercised via synthetic events, but
  **never confirmed by the operator's own hand on the keyboard.** ask him to press `←` `→` `↑`
  before calling this gate closed.
- Peter's original acceptance checklist (`MCII-Spatial-UI-Handoff.md` §10) has not been formally
  checked line-by-line against the built room.

## 2026-08-29 — 16. THE REPLY PANE COULD RENDER PAST THE BOTTOM OF THE WINDOW
- operator: screenshot of Orion's answer cut off mid-sentence at the very bottom of the screen,
  right where the Dock sits, looking like the Dock was covering the text.
- root cause: `--proj-y` (the projector's top anchor) reserved a flat 96px of headroom below
  itself for the sill. That was only ever enough for the EMPTY-reply case (`.st-reply:empty` has
  `display:none`, so the pane is just the prompt row). Once a real answer arrived, `.st-reply` had
  its own flat `max-height:170px` on top of the prompt row and paddings — a full pane could run to
  ~230px+, blowing straight through the 96px reservation. The sill sits flush at the room's own
  floor, which is flush with the WINDOW'S bottom edge, so every pixel past the sill was a pixel
  rendered outside the Electron window entirely. The Dock was never covering anything; the content
  simply did not exist inside the visible window past that point.
- verified with a synthetic 14-sentence reply (scrollHeight 280px) before the fix: pane overshot
  the sill. Same test after: paneBottom sat 12px inside the sill, reply area correctly shrank to a
  scrollable 85px window on the 280px of text.
- fix: `measure()` now reads the sill's own rendered top (measured, not the old flat 96) and sets
  `--proj-cap`, the real available height between the anchor and the sill. `.st-projector-pane` is
  `display:flex; flex-direction:column; max-height:var(--proj-cap)`; `.st-prompt-row` is
  `flex:none` (never compressed); `.st-reply` is `flex:1 1 auto; min-height:0` (takes whatever is
  left, scrolls for the rest) instead of a flat 170px. The pane can now never exceed the room it
  actually has, at any window height, on any screen.
