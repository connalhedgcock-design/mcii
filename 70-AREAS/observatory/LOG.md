---
id: area.observatory.log
t: area-log
v: 5
upd: 2026-09-05
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

## 2026-08-29 — 17. DOOR PLATES + SILL WERE LOWERCASE, OPERATOR CALLED IT UNPROFESSIONAL
- operator: "fix the text in the app its all lowercase right now like under the doors and on the
  bottom and it looks hella unprofessional." then, after a first pass to Title Case: "make it all
  capital like 'YOUR COINS' for example."
- root cause: `.st-portal-plate` carried `text-transform: lowercase` from Peter's original handoff
  (comment: "Lowercase, wide tracking — a placard, not a menu item"), and the source label/blurb
  strings in `station-geometry.js` were themselves authored lowercase, so both the plate and the
  sill (which reads the same `label`/`blurb` fields) rendered lowercase everywhere.
- fix: `.st-portal-plate`, `.st-sill-door` and `.st-sill-blurb` now carry `text-transform:
  uppercase` instead — matching the station's OWN established voice (`.st-label`, THE UNIVERSE,
  CAUTION PANEL, ATTENTION are all already all-caps with wide tracking elsewhere in this room).
  Lowercase was the one inconsistent style in the whole HUD, not a deliberate accent. Source
  strings in station-geometry.js stay Title Case for readability in code; the CSS transform is
  what renders them, the same pattern `.st-label` already used successfully.
- also fixed in passing: the flat tab bar's fomo/axiom buttons were left lowercase from when those
  doors were added, inconsistent with their Title Case siblings (Portfolio, Journal, Market) — now
  FOMO / Axiom.

## 2026-08-29 — 18. CORRECTION: THE SILL IS A SENTENCE, THE PLATE IS A PLACARD
- operator, immediately after #17 made both all-caps: "make the text under the doors caps lock but
  the text in the bottom bar just like properly capitalized."
- ! two different registers for two different jobs, not one voice repeated twice. `.st-portal-plate`
  stays `text-transform: uppercase` (a placard, read at a glance across the room). `.st-sill-door`
  and `.st-sill-blurb` reverted to no transform, rendering the already-proper-case source strings
  from station-geometry.js as authored ("Your Coins" / "What you are holding and tracking").
- verified on screen: doors read THE PORTFOLIO / YOUR COINS / THE MARKET; the sill directly below
  reads "Your Coins" / "What you are holding and tracking" in the same pass.

## 2026-09-04 — 19. FIVE OF THE SIX DOORS GOT REAL ROOMS, NOT JUST FLAT TABS
- operator: "the observatory room is great... but the rest of the app does not fit with the theme
  of the observatory, find unique and creative ways to represent each of the different sections."
  Asked for renders first, gave feedback across three passes ("it looks kinda messed up now like
  everything is misplaced" → fixed a layout bug; "make the indicators easier to read... i dont
  want to feel like any efficiency/information from the current screens is lost"; "i dont want you
  to add like the names like 'docking bay' to the rooms i dont wanna remember like code words for
  each room just keep it as 'your coins' and stuff"), then: "make all of them like how the renders
  are but obviously more intergrated with the app."
- what was built: Your Coins, The Market, What's Happening, The Journal and The Portfolio each got
  a real spatial room (`station/room-watch.js`, `room-market.js`, `room-sector.js`,
  `room-journal.js`, `room-folio.js`, shared scaffold in `rooms.js` + `rooms.css`) — a per-room
  animated backdrop (a dock of berths, a sensor sweep, a comms dish + waveform, a calibration dial,
  cargo sized by weight) behind a wall of real `.st-board` instruments, the same component the
  Observatory's own boards and the Portfolio's flat view already use. Rooms are named exactly what
  the door already calls them (Your Coins, The Market, ...) — no invented names, per the operator's
  instruction above.
- ! architecture decision, and the reason nothing about the existing flat screens changed: each
  room mounts into a NEW sibling element next to the flat `<main>` it replaces, never into the main
  itself. `app.js`'s own load functions keep populating that hidden main exactly as before — a bug
  in a room can only ever affect that room, never the flat screen underneath it, and nothing in
  `app.js` was touched to make this work. `boot.js` (the one sanctioned seam file) now also decides,
  per view, which of the two — room or flat main — is actually shown; the flat main is set `hidden`
  (not merely `visibility:hidden`) or it sits invisible in normal flow and shoves the room's content
  down behind a wall of blank space — caught and fixed before shipping, not a live bug.
- FOMO and Axiom deliberately did NOT get a parallel spatial room: their content is a native,
  pixel-positioned Electron view (`venueRect()` in `app.js` measures a DOM box and reports its
  screen rect over IPC), not something CSS can transform. Warping that box would misalign the real
  embed from its frame. They kept their existing flat bar and just gained a starfield background
  behind it, added via a wrapper `div` around each `<main>` so `showVenue()`'s own
  `innerHTML` writes never touch it — zero risk to the live trading embed.
- scope cut, logged rather than silently dropped: each room carries the numbers that matter at a
  glance (verdict, price, move, what's sellable; the scanner's sorted contacts; the triage counts
  and top posts; calibration + both operators' open forecasts; the combined and per-venue book).
  The exhaustive detail on a coin's flat card — the price chart, the social panel, "where these
  numbers came from" — was NOT rebuilt a second time; Your Coins' room has a "detail" link per row
  that jumps to the real flat card instead. What's Happening's room also drops the market-wide
  funnel stats, the "coins the scanner found" table and the J7 Tracker link that the flat tab has.
- ! NOT YET CONFIRMED ON SCREEN. This session has no way to launch the real Electron window or
  screenshot it — the code was written against the exact data shapes read out of `app.js` (verified
  field-by-field: `t.gate.verdict`, `t.market.priceUsd`, `t.exit.usd`, the D-117 24h-change rule,
  the `screenLatest()`/`sector()`/`portfolio()`/`calibration()` response shapes) and passed the
  existing `station.test.js` / `station-css.test.js` / `renderer.test.js` suites unchanged, but
  nobody has pressed the actual tabs yet. Do that before calling this done.

## 2026-09-04 — 20. #19 SHIPPED UNTESTED AND IT SHOWED — THE BOARDS COLLAPSED, THE BACKDROP FLOATED
- operator, with screenshots from the real app: "it looks kinda messed up now like everything is
  misplaced." Then, after a first fix: "still looks terrible... you should be running the app and
  taking screenshots making sure it looks perfect before you finish" — correctly calling out that
  #19 shipped on code review alone, with no visual confirmation, exactly the risk its own entry
  flagged and then nobody closed.
- bug 1, real and confirmed from the screenshot: the "tracked coins" board (`grid-column: span 2`
  of 3) rendered as a near-zero-width sliver with its own label wrapped one letter per line, while
  the "alerts" board (span 1) took the whole row — CSS grid's item auto-sizing losing to something
  in this file under conditions never isolated. Fixed by replacing the grid with flexbox
  (`flex: 2.2 1 380px` / `flex: 1 1 220px`, `flex-wrap: wrap`) — a pattern already proven in the
  concept-render pass and not vulnerable to the same failure class.
- bug 2: the room's backdrop motifs (berths, the sensor sweep, the calibration dial, cargo) were
  positioned by PERCENT OF THE WHOLE ROOM (`bottom: 4%`, `top: 8%`), which read fine against the
  first draft's forced near-viewport-height room. Once the room was made content-driven (fixing the
  dead-space complaint below), the boards routinely ran right past those percentage marks and the
  motif ended up mostly hidden BEHIND the opaque board, with only a sliver poking out past its
  bottom edge — the "little disconnected empty boxes" in the screenshot. Root cause: two different
  sizing models (percent-of-variable-room vs. content-driven-room) coexisting without either being
  told about the other. Fixed by giving every room a FIXED backdrop band (`--fl-band: 128px`) that
  `.st-flatwall` is pushed below with `margin-top`, and repositioning every motif to fixed pixel
  offsets within that band, measured from the room's top — not a percentage of its total height,
  which can no longer move the motif behind a board at any content length. One motif (What's
  Happening's waveform) had the same bug in a second form — `bottom: 14px`, which anchors to the
  real bottom of a now-content-driven room rather than the band — same fix, `top` instead.
- bug 3, the original complaint's root cause: `.st-flatroom { min-height: calc(100vh - 220px) }` —
  written assuming the backdrop would fill that space; it doesn't, it's a handful of small motifs,
  so most of a near-full-screen room sat empty and black. Fixed: `min-height: 360px`, room otherwise
  sized by its own content (topbar + band + wall).
- bug 4: the flat `#alerts` strip (old style, amber-bordered cards) stayed visible above Your
  Coins' new room, showing the same alerts twice in two different visual languages. It's watch-only
  already (`switchView`); now also hidden whenever the watch room is the thing on screen.
- ! WHAT ACTUALLY CHANGED THIS TIME: built `app/renderer/mock-mcii.js` + `app/renderer/test.html`
  — a fake `window.mcii` (every call the renderer makes, resolved with realistic sample data) plus
  a copy of `index.html` that loads it before `app.js`. Served over a plain local HTTP server
  (`python3 -m http.server`, from `app/renderer/`) so a real Chromium tab renders the real
  `station/*.js` and `station/*.css` unmodified and can be screenshotted and measured
  (`getBoundingClientRect()`, computed styles) like any other web page. This is what actually found
  bug 1's exact mechanism and bug 2's exact pixel math, on the first pass, after two rounds of pure
  code-reading had missed both. ! next session: reach for this BEFORE claiming a station change is
  done, not after the operator sends back a screenshot. The harness costs about a minute to stand
  up and is still sitting in `app/renderer/` (clearly named, not wired into the real `index.html`)
  for exactly that reason.
- verified live (not just read): all five rooms screenshotted at 1100px and 820px width, the
  Your-Coins "detail" link confirmed to land on the real flat card (`#grid` un-hidden, 6 real
  `.card` elements present, room hidden), and the narrow-width case (row buttons overflowing the
  board edge, a fifth bug caught only by resizing the tab) fixed with `flex-wrap` on `.st-flatrow`
  before it ever reached the operator.

## 2026-09-05 — 21. THE ROOMS REBUILT AGAINST THE OPERATOR'S OWN ANSWERS, AND THE EIGHTH DOOR THAT COULD NOT EXIST
- source: the 34-question worksheet came back filled in. Answers are transcribed VERBATIM in
  [[design/ROOM-BRIEF|design/ROOM-BRIEF.md]] §A — read that, not a summary of it. §B is what the
  answers decide, §C is what he did NOT answer (do not invent those).
- what the answers changed, room by room:
  - **Your Coins** — "the graph is shit" and the original render was "poorly executed. Everything
    was overlapping". Rebuilt: a real price+volume chart (`readouts.js: stripChart/wireChart`), a
    per-row sparkline, and every row now carries a WORD for its reading, not just a colour.
  - **The Market** — planets and asteroids, per §10, sized by market cap on a log scale and placed
    by volume-shock. Needed a new number the app did not collect: `volShock()` in `main/index.js`
    measures today's volume against that coin's OWN trailing MEDIAN, over observations older than
    24h. ! median and the 24h exclusion both matter — `vol24` is itself a rolling 24h figure, so
    averaging the spike into its own baseline is how a doubling reports as +40%.
  - **What's Happening** — the three things #19 cut are back, per "No dont lose those find a new
    way to display all the same information": the funnel stats, the J7 Tracker link, and the
    coins-the-scanner-found table.
  - **The Journal** — REDESIGNED, not refined. Asked instrument-or-ship's-log the operator said
    "Narrative and chronological", so the calibration dial is demoted to a readout and the room is
    one stream in time under day headings. Gained an "orion asks" board and a "connections" board,
    both on a button — each is a real Claude CLI subprocess and firing it on every render would
    spend money to redraw a screen nobody asked a question on.
  - **The Portfolio** — the joint FOMO+Axiom figure, its 24h change and a value graph.
- **`synthesis.js` is the new load-bearing file**, and it is pure functions with its own test
  (`app/test/synthesis.test.js`, 31 assertions). Four laws it exists to enforce, all from the
  answers: a MISSING input drops out and cuts coverage rather than voting 0; a CONFLICT is its own
  state and is never averaged into a shrug; manufactured enthusiasm votes NEGATIVE, not unknown;
  and there is NO FAKE INPUT — `trader` is always absent because nothing feeds it yet.
- **THE WAR ROOM EXISTS, BUT NOT AS A DOOR — and that is a correction to this vault's own brief.**
  ROOM-BRIEF §B.6 says "an eighth door ... is approved". It is not buildable, and the geometry is
  what says so, not taste:
  - every door angle must be an even multiple of 14° so a vault rib lands over the doorway and a
    glazed bay over each pillar (`VAULT_SEG_DEG`), i.e. every door sits on a multiple of 28°;
  - a door also has to be inside the visible arc, and past ~90° the projection `x = -R·sin(θ)`
    turns back toward the centre — a door at 112° renders at 0.93 where the 84° door renders at
    0.99, so it would appear BETWEEN two existing doors, not beyond them.
  - 0, ±28, ±56, ±84 is therefore the complete set. **The ring holds exactly seven doors and all
    seven are taken.** I built it at ±112 first, and `station.test.js`'s "screen-x DESCENDS as
    array index rises" caught it immediately — the one invariant that encodes "where does ↑ take
    me". The geometry change (and the HULL_SPAN_DEG 133→154 it dragged in) was reverted whole.
  - so the War Room is reached from the TAB BAR, and from a "How was this read? →" link under the
    compact verdict in Your Coins and The Market — which is arguably where it belongs anyway: you
    go to the deep synthesis FROM the coin that raised the question, carrying that coin with you
    (`mcii:open-room` → `boot.js` → `room.focus(ca)`, the same one-way seam rule as
    `mcii:open-flat`; a room still never reaches into another room or into app.js).
  - ! OPEN: there is no way into the War Room from inside the Observatory, because the tab bar is
    hidden there and it has no door. Ask the operator before spending anything on it — the honest
    options are re-architecting the door/vault alignment law, or an affordance on an existing
    board, and the second is much cheaper.
- the room itself is about the ARITHMETIC, not the verdict — the operator asked to "see how the
  data is being assessed". Its middle board prints the actual expression `fuse()` evaluates: every
  input, what it saw, its move, its trust, its weight and its signed effect, then the sum, the
  divisor and the resulting reading. Its last board, `what this room cannot see`, NAMES the three
  blocked inputs (trader flow, real-world events, prediction markets). A synthesis screen that
  shows only what it happened to collect reads as complete when it is not.
- ! `room-warroom.js` computes nothing of its own — every figure comes from `synthesis.js`, the
  same functions the compact panels call. A second fusion written to look good on this one screen
  is how an "explain the assessment" room ends up disagreeing with the assessment.
- **verified in the harness before shipping this time** (#20's lesson, applied rather than
  re-learned). `app/renderer/test.html` + `mock-mcii.js` over `python3 -m http.server`, then a
  scripted layout audit across all six rooms at 1280 / 1024 / 860 px asserting: no board narrower
  than 190px, none collapsed, none overlapping another, no board past the room edge, no label
  squeezed, no horizontal page scroll, and no backdrop motif reaching under the wall. Two real
  bugs came out of it, neither visible by reading the code:
  - **The Market's sweep broke the band law.** `.fl-sweep` is a 340px circle centred 60px down, so
    it hung 102px past the 128px band and painted behind the first opaque board, re-emerging in
    the wall's side gutter — LOG #20's bug 2 in a third form, in the very file that documents the
    rule. Fixed by clipping both market motifs inside a `.fl-band` wrapper (`overflow:hidden`)
    rather than trusting each motif to stay inside a boundary nothing enforced.
  - **The War Room read zero coins.** `getTokens()` resolves to the ARRAY, not `{tokens: [...]}`;
    the room unwrapped a property that does not exist and rendered every board perfectly, empty.
    That failure mode looks like a design problem and is a data-shape one — worth remembering.
  - ! module caching bit twice during this: `python3 -m http.server` + a reload kept serving the
    OLD `station/*.js`, and a fix looked like it had not worked. Serve on a NEW PORT to bust it.
- ! STILL NOT SEEN IN THE REAL ELECTRON WINDOW. Everything above is the real `station/*.js` and
  `rooms.css` rendered by a real Chromium against mock IPC. The data shapes were checked against
  `preload.js` and `app.js` call sites, but nobody has pressed these tabs in the actual app.
- pre-existing and NOT from this work, but they should not sit unexamined: `sweep`, `importance`,
  `history` and `alerts` fail on the current tree. All four exercise `shared/importance.js`,
  `main/adapters/twitterapi.js`, `main/history.js` and `main/alerts.js` — none of which this
  change touches. `npm test` runs with `&&`, so `alerts` failing first HIDES the other three.

## 2026-09-05 — 22. "THE CONCEPT IS THERE AND IT'S STILL BEING BUILT" — THE ROOMS FINISHED
- operator, after #21: "they still all just look sloppy and like not correct... in the whats
  happening tab the scanner doesnt go over the planets and stuff. it almost looks like the concept
  is there in every room and its still being built."
- ! THE DIAGNOSIS WAS ARCHITECTURAL, NOT DECORATIVE. #20's band law — a fixed 128px strip the wall
  is pushed below — solved a real bug (motifs hiding behind opaque boards) by creating a worse
  one: every room was a decorative strip holding two small doodads, sitting on top of a stack of
  flat cards on black. Nothing about that composition can be fixed by improving the doodads. Three
  changes replaced it:
  1. **The rooms got an environment.** A panelled far wall running the FULL height behind
     everything, plus a lit horizon seam at the top. ! the first attempt was a perspective floor
     at the room's bottom edge, which is invisible: these rooms are content-driven and routinely
     run past 3000px, so anything anchored to the bottom sits far below the fold. An environment
     here has to work at any height and any scroll position — a far wall does, a stage floor does
     not. It lives in its own `.st-flatenv` layer because every room overwrites `beyond.innerHTML`
     on render and would otherwise wipe it.
  2. **The boards became glass** — translucent with a backdrop blur, and this REVERSES #20's
     working assumption. There, motifs were kept out from behind boards because a board was opaque
     and swallowed them. Translucent boards mean the room is now MEANT to be read through the
     instrument, which is most of what makes a panel read as standing in a space rather than
     pasted on one. The blur is what keeps 11px mono legible over a grid.
  3. **A room-wide scan.** First shipped ABOVE the wall; operator: "i dont like how it overlays in
     front of everything else it should be in the background". Correct — a wash crossing live
     numbers is a veil over the reading. It sits at z-index 1, below the wall, and the glass
     carries it through from behind.
- **The Market, which is what the operator was actually pointing at.** Its sweep was decoration in
  the strip ABOVE the plot, rotating over nothing while the contacts sat in a board underneath it.
  A radar sweep that never crosses the things it is finding is the clearest possible tell that a
  screen is a mock-up. Four fixes, in order of how much each one mattered:
  - the sweep is now part of the plot, centred on its origin, turning under the bodies. ! it is a
    CSS conic-gradient behind the svg, not an svg wedge inside it: a sweep's whole character is
    that it fades ANGULARLY behind its leading edge, and an svg wedge filled with a radial
    gradient fades outward instead — which is why the first attempt read as a hard triangle laid
    over the chart. A radial MASK on top of the conic supplies the range falloff conic cannot.
  - ! `st-spin` sets `transform: rotate()`, which REPLACES the whole transform property —
    including the `translate(-50%,-50%)` centring the sweep on the plot origin. It was rotating
    around a point ~500px off the chart. Any element positioned by transform AND animated by
    transform needs its own keyframe carrying both. Caught by measuring the two centres, not by
    looking — on screen it just read as "a slab slides past".
  - the band repeater came out entirely. Operator: "the scanner that was there in the wrong spot
    is still there as well as the new fixed scanner". One room, one scanner; this room's scanner
    is the plot, where the contacts are. The Market also opts out of the room-wide scan
    (`mountRoom({scan:false})`) — two unrelated sweeps at two speeds read as two bugs, not one idea.
  - the bodies stopped overlapping. Coins that moved alike land on the same spot BY CONSTRUCTION,
    so a short relaxation pass separates them, capped at 16 plot units from where the data put
    them — far less than the distance to an axis, so a contact can never cross into a quadrant it
    does not belong in. Measured after: worst remaining overlap 1px, down from bodies fully
    buried. Labels are FLIPPED rather than nudged, and are tested against labels already placed —
    testing a label against a BODY is why the first attempt still smeared "POPCAT" over "BOME".
- other rooms, same complaint, smaller causes: What's Happening's waveform was drawn straight from
  the day's top posts, so a quiet day rendered three stubs in the corner of an empty band — it now
  always spans, with the real posts as its peaks. Its dish was one thin ring bleeding off the
  corner; it has ribs, a rim and a feed arm now. The Journal's ribbon carried only entries, so a
  quiet week was one tick on a bare line — it is graduated, one mark per day, and a quiet week
  reads as a quiet week. The War Room's four feed rails were rotated divs crossing each other past
  their own convergence point, which read as scratches on the glass; they are one svg now, curves
  that actually meet at a node and stop, with the pulses staggered.
- ! FORM CONTROLS WERE INHERITING `style.css` — the FLAT app's light stylesheet — so The Journal's
  note box rendered as a bright white slab across a dark instrument wall. That one unstyled
  element did more to make the room look unfinished than any motif did. Inputs, textareas and
  buttons inside `.st-flatwall` now have the station's own voice.
- two more that only showed up under measurement: the beyond layer starts at the room's own top
  edge while the placard row sits in normal flow above it, so a full-width motif anchored at 0
  runs straight THROUGH the title — that is what the War Room's rails and the Portfolio's crates
  were doing. Both now clear the row. And Your Coins' berth labels were riding each berth's lift,
  leaving the row ragged; the tag counter-translates its own lift so the names sit on one baseline
  while the berths still rise and fall with the day's move.
- verified: all six rooms audited at 1280 / 1024 / 860 px — no sliver, collapsed, overlapping or
  overflowing board, no horizontal page scroll, the scan proven to sit below the wall, The Market
  proven to carry no room-wide scan, and no painted motif element inside the placard's box. Every
  station/synthesis/journal/portfolio/sector suite still passes.
- ! still not seen in the real Electron window — same caveat as #21.
