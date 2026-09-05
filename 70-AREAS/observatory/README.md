---
id: area.observatory.readme
t: area-readme
v: 3
upd: 2026-09-05
machine: austin
---
# THE OBSERVATORY — the spatial control-room UI

## WHAT IT IS
A 3D "room" (`renderer/station/`) that Austin lands in when the app opens. A holographic Earth
(WebGL2, `holo-globe.js`) stands in the centre; six instrument boards hang from the ceiling around
it, reading the live watchlist; six doors stand on a ring behind everything. As of 09-04, five of
those doors open onto a REAL room of their own rather than a flat tab — Your Coins, The Market,
What's Happening, The Journal and The Portfolio each got a spatial backdrop + a wall of real
instruments, reading the exact same live data the flat screens do (see LOG.md #19). FOMO and Axiom
stay flat — their content is a native, pixel-positioned Electron view that cannot take a spatial
transform. `←`/`→` turns the room to face a door, `↑` walks through it. Orion (the assistant) lives
under the globe as a text prompt.

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
                             reaches into app.js's internals — app.js is a file Connal also edits).
                             also now decides, per view, whether a real room or the flat main shows.
  rooms.js / rooms.css     <- shared scaffold + styles for the five doors below. reuses .st-board /
                             .st-lamp / .st-placard verbatim rather than reinventing the instrument.
  room-watch.js            <- Your Coins: a dock of berths behind the tracked-coins board.
  room-market.js           <- The Market: a sensor sweep behind the scanner's sorted contacts.
  room-sector.js           <- What's Happening: the signal layer's own room (violet).
  room-journal.js          <- The Journal: a calibration dial behind two never-blended logbooks.
  room-folio.js            <- The Portfolio: cargo sized by weight behind the real position table.
  room-warroom.js          <- The War Room: the ARITHMETIC behind a reading, not the reading. No
                             door on the ring (it is full -- LOG #21); reached from the tab bar and
                             from "How was this read?" in Your Coins / The Market.
  synthesis.js             <- pure fusion: votes, weights, coverage, conflict, confidence. The one
                             place that decides what the data MEANS. Tested by test/synthesis.test.js.
  readouts.js              <- the shared readouts the rooms draw with: price/volume chart, sparkline,
                             confidence needle, verdict panel.
                             (each of the five reads window.mcii directly — a second, independent
                             read of the same live data, never a share of app.js's own state.)
app/main/orion.js          <- the assistant's main-process half (Claude CLI subprocess, auth)
app/test/station.test.js  <- geometry invariants: arrow direction, door framing, no-overlap, etc.
```

## READ NEXT
- [[design/ROOM-BRIEF|design/ROOM-BRIEF.md]] — ! the operator's own answers to the 34-question room
  worksheet (2026-09-05), verbatim, plus what they decide, what is buildable today and what is
  blocked on data that does not exist yet. This is the current brief for every room. Read it first.
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
