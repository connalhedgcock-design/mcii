---
id: log.visual-audit-and-hud-first-look-2026-09-16
t: log
v: 1
upd: 2026-09-16
machine: austin
---
# Visual audit of all rooms + the HUD's first look on screen

Picking up after a gap since 09-10 — nothing had been logged since, though real commits landed
(coin research in The Story, and the whole HUD build, see `90-TASKS/HUD-BUILD-PLAN.md`). Two
things done this session: a full visual re-audit against `70-AREAS/observatory/LOG.md #22`'s own
bar, and the HUD window's content rendered on screen for the first time ever.

## ALL EIGHT ROOMS RE-AUDITED, 1280/1024/860px

Same method as #22: measured every `.st-board` rect in Your Coins, Market, What's Happening,
Journal, Portfolio, War Room, The Story and Traders. Zero overlaps, zero collapsed/tiny boards,
zero off-screen boards at any of the three widths, in every room — including The Story and Traders,
which were built 09-09/09-10 and never had this check run against them.

## REAL BUG FOUND AND FIXED: the tab bar overflows at 860px

`.tabs` (`style.css`) is a plain `display:flex` with no wrap and no `overflow-x`. It fit the
original six rooms; War Room, The Story and Traders were added after the last 860px check (#22,
09-05) and nobody re-ran it. At 860px the bar ran past the viewport — FOMO and AXIOM tabs cut off
the right edge — and dragged the WHOLE PAGE into horizontal scroll with it, not just the bar.
Fixed: `.tabs` gets `overflow-x:auto` (scrollbar hidden), each `.tab` gets `flex-shrink:0` so labels
never truncate. Verified: `docScrollWidth === winWidth` at 860px now; `station.test.js` and
`station-css.test.js` still green.

## THE HUD WINDOW, SEEN ON SCREEN FOR THE FIRST TIME

`HUD-BUILD-PLAN.md` flagged this as the one open item: the floating window (`app/main/hud.js`,
`app/renderer/hud/*`) was built and its backend live-tested, but nobody had looked at it — Connal's
running MCII wasn't restarted to check, on purpose (never yank a live trading window).

Rather than touch a live app, gave the HUD renderer its own visual harness, matching the existing
`renderer/test.html` pattern: new `app/renderer/hud/test.html` loads `mock-mcii.js` +
`hud/hud.js` standalone. `mock-mcii.js` was missing the HUD IPC surface entirely — `tradeHud`,
`pinToHud`, `unpinHud`, `onHudCoin` all threw `not a function` the moment anything touched them
(caught because Your Coins' new "pin" button, added by the HUD work, calls `pinToHud` on click).
Also missing, unrelated to the HUD: `notableFor`, thrown by `room-watch.js` on every load. Added
all five with realistic mock data (`onHudCoin` auto-fires with a test address so the standalone
harness has something to show).

Rendered at the real window size (380×620, from `hud.js`'s own `BrowserWindow` config): price,
mcap/liq line, the price chart (reuses `readouts.js: stripChart`, same visual language as the rest
of the app), the shape indicators with their YES/forming/no chips, top-5 holder forensics,
creator's-history, and the story feed all lay out cleanly — no overlap, no cut text, nothing
fighting the 380px width. `room-watch.js`'s "pin" button, the other half of #22's-era-plan concern
("CSS wrapping/overflow not checked visually"), also confirmed clean: `.st-flatrow` already had
`flex-wrap: wrap` from an earlier fix, so DETAIL and PIN sit side by side with room to spare.

! STILL NOT SEEN: the real frameless/always-on-top Electron chrome (drag, close button, staying
above other windows) — that part is OS-level and this harness can't touch it. Everything checked
here is the HTML/CSS content INSIDE the window, which was the part actually in question. Next real
step, same as the build plan already said: pin a real bonding coin from inside a running MCII, when
someone's ready to restart it.

## FILES CHANGED

- `app/renderer/style.css` — `.tabs`/`.tab` overflow fix.
- `app/renderer/mock-mcii.js` — added `notableFor`, `tradeHud`, `pinToHud`, `unpinHud`, `onHudCoin`.
- `app/renderer/hud/test.html` — new, visual harness for the HUD renderer (same shape as the main
  app's `test.html`).
