---
id: area.observatory.readme
t: area-readme
v: 1
upd: 2026-08-29
machine: austin
---
# THE OBSERVATORY — the spatial control-room UI

## WHAT IT IS
A 3D "room" (`renderer/station/`) that Austin lands in when the app opens. A holographic Earth
(WebGL2, `holo-globe.js`) stands in the centre; six instrument boards hang from the ceiling around
it, reading the live watchlist; six doors stand on a ring behind everything, each opening onto one
of the app's existing flat tabs (Your coins, Market, What's happening, Journal — two more doors are
sealed, not yet built: the wallets, prediction markets). `←`/`→` turns the room to face a door,
`↑` walks through it. Orion (the assistant) lives under the globe as a text prompt.

Built from a design document Austin's friend Peter wrote (`MCII-Spatial-UI-Handoff.md`, not in this
repo — it was a pasted file), based on the spatial UI Peter built for his own project ("Daedalus").

## STATUS, as of 08-29
Gates 1–6 of the 10-gate build order are done and verified live (screenshotted + measured, not just
read): empty room, doors + ring geometry, the globe, walking through a door, all six instruments on
real data, Orion wired to the Claude CLI. Gate 7 (acceptance pass at four window sizes) has not
been formally run end-to-end. Arrow-key navigation and walking through a door are BUILT but
**Austin has not yet confirmed them himself** — this session's terminal cannot send real clicks or
keystrokes (no accessibility permission), so navigation was verified by driving synthetic events
from inside the page, not by a real hand on the keyboard.

## WHERE EVERYTHING LIVES
```
renderer/station/
  station.css            <- the whole spatial layer. by far the largest file. see design/DESIGN.md
  station-geometry.js    <- door ring math, board layout rules. PURE FUNCTIONS, zero imports.
                             tested by app/test/station.test.js — geometry is asserted, not eyeballed.
  station.js             <- the mount: builds the DOM once, owns turning/walking/keyboard/Orion.
  holo-globe.js           <- the hologram. raw WebGL2. zero dependencies. includes the Earth land grid.
  instruments.js          <- the six board renderers + the live data snapshot they read from.
  boot.js                 <- the ONE seam into app.js (clicks the app's own tab buttons; never
                             reaches into app.js's internals — app.js is a file Connal also edits)
app/main/orion.js          <- the assistant's main-process half (Claude CLI subprocess, auth)
app/test/station.test.js  <- geometry invariants: arrow direction, door framing, no-overlap, etc.
```

## READ NEXT
- [[design/DESIGN|design/DESIGN.md]] — the design language (colour law, typography, motion, the six
  instrument silhouettes, the anti-AI-slop bans). Written to be REUSABLE if another spatial room
  gets built later — the principles aren't Observatory-specific.
- [[functionality/INSTRUMENTS|functionality/INSTRUMENTS.md]] — what each of the six boards shows,
  where its data comes from, and how the caution-panel coin-selection feature threads through all
  of them.
- [[LOG|LOG.md]] — the full build history and every bug found, in the order it happened. Long. Read
  it before touching `station.css`'s 3D transform chain or the globe's camera math — several of the
  entries are exactly the mistake you are about to make.

## THE ONE IDEA, IF YOU READ NOTHING ELSE
**The instruments are bolted to you; the room is beyond them.** Only `.st-beyond-world` ever
receives a yaw transform. The canopy, the instrument columns, the globe and the sill are
screen-fixed and never rotate. This is the entire depth illusion and the entire reason turning
doesn't make the instruments swim.
