---
id: whisper.idx
t: whisper-index
v: 1
upd: 2026-08-31
machine: connal
---
# WHISPERS — half-formed thoughts, captured before they evaporate

!! THE POINT: a thought Connal has once and does not write down is gone. Whispers exist so the
cost of catching one is ~zero. Everything expensive (organizing, connecting, judging) is MY job,
not his. ! if capture ever requires him to think about format, this system has failed.

## THE ONE RULE FOR HIM
Open `INBOX.md`, type the thought on a new line, done. No date, no tags, no frontmatter, no
complete sentences. Fragments are fine. Contradicting an earlier whisper is fine.

Three ways in, all equivalent:
- type it straight into `INBOX.md`
- `/whisper <thought>` in chat
- ! **any message starting with `whisper:`** — this is the one he actually uses. it is a capture
  instruction, NOT an invitation to discuss. append verbatim, confirm in one line, stop. pinned in
  `CLAUDE.md` §2 so it survives a session that never reads this file.

## THE RULES FOR ME
- ! whispers are INPUTS, NOT CLAIMS. the mandate's "no claim without a falsifier" does NOT apply to
  a raw whisper — a whisper is allowed to be a vibe, that is literally what it is. the falsifier
  rule reattaches the moment a whisper is promoted into a project decision (see PROMOTION below).
  ∵ demanding rigour at capture time kills capture. demanding it at commit time is just hygiene.
- ! never delete a whisper. never "clean up" the wording — the register carries information (same
  reason 70-AREAS/AREAS.md says quote the operator verbatim).
- ! never silently reinterpret one. if I think a whisper means something he did not say, that is my
  inference and gets marked `est:`.
- whispers are NOT tasks. a whisper that turns out to be a task moves to the relevant area, and
  the whisper stays where it is with a link.

## FILES
```
80-WHISPERS/
  README.md      <- this. how the system works.
  INBOX.md       <- ! raw captures, append-only, zero-friction. his file. I only ever ADD ids.
  SYNTHESIS.md   <- the connection map. MY file, rewritten each pass. this is the actual product.
  w-NNN-slug.md  <- one file per PROMOTED whisper — only once it has earned expansion.
  <topic>/       <- a THREAD: whispers that turn out to be about one subject, gathered w/ my
                    expansion. created only when several whispers converge, never pre-emptively.
```

## TOPIC THREADS
- [[analysis-algorithm/README|analysis-algorithm/]] — how raw data becomes a read: per-tweet
  extraction, discovery, attention measurement, whale tracking. sits UPSTREAM of the trading
  strategy. holds w-001..w-005.
! A THREAD HOLDS THE THINKING; THE AREA HOLDS THE DECISIONS. what gets decided or built moves to
`70-AREAS/<subject>/`, and the thread links to it. ∵ one fact living in two places means neither
gets trusted or updated. if a thread starts accumulating settled facts, that is the signal to
promote them out, not to let the thread become a second area.

## IDS
Every whisper gets `w-NNN` (zero-padded, never reused, assigned by me on the next pass after it is
captured). ∵ a thought that cannot be referenced cannot be connected to anything, and the whole
value here is in the connections.

## PROMOTION — when a whisper becomes its own file
Only when at least one is true:
- it connects to a live project in a way that changes what gets built, or
- it recurs (he whispers the same idea ≥2 times, in different words — that repetition IS the signal), or
- he asks for it to be expanded.
On promotion: copy `_tpl/_tpl-whisper.md`, keep the ORIGINAL wording verbatim at the top, and only
then add my expansion beneath it. ! a promoted whisper that feeds a real decision acquires a
falsifier and a conf% at that point, per [[mandate]]. before that it is exempt.

## SYNTHESIS — the part that is actually hard
Run on `/whispers`, or when he asks, or unprompted if a new whisper obviously collides with live
work. Rewrite `SYNTHESIS.md` fully each time (it is a current-state map, not a log).

! THE FAILURE MODE THIS MUST AVOID IS APOPHENIA. Given ~any two texts I can manufacture a
connection, and a system that always finds five is producing horoscopes — which is exactly the
`narrative-fitting` and `false precision` the mandate already bans. Discipline:
- a connection must name a SPECIFIC consequence: "w-004 + trading-strategy → the entry signal
  should X". "these both relate to risk" is not a connection, it is a word match. delete it.
- ! every pass MUST include a `CONSIDERED AND REJECTED` section with the near-misses and why they
  are thin. a pass that rejects nothing did not discriminate, and I should distrust its hits.
- cap it: at most ~5 live connections. if a 6th is better than an existing one, it replaces it.
  scarcity is what keeps them worth reading.
- mark each `strong:` / `plausible:` / `thin:`. thin ones live in the rejected section, not the top.
- ! prefer connections BETWEEN WHISPERS over whisper→project. two independent thoughts converging
  is real evidence about how he actually thinks; a whisper matching a project I already know about
  is the easiest and least informative link to draw.
- state what would make each connection wrong. it is a claim now, so the mandate applies.

## CURRENT LIVE PROJECTS (what synthesis maps against — keep this list current)
- [[70-AREAS/trading-strategy/README|trading-strategy]] — picking coins to buy/sell, paper-traded
  first. the entry-signal algorithm is the open question. ! carries the permanent boundary.
- [[70-AREAS/mcii-overview/OVERVIEW|mcii-overview]] — what the app actually is, as-built.
- [[70-AREAS/observatory/README|observatory]] — the spatial UI.
- discovery gap — the scanner only finds coins 3 momentum-biased ways; `resolve.js: unknownTickers()`
  is a half-built organic-discovery path. see trading-strategy README.
- telegram liquidity alerts — `cloudflare/telegram-alerts/`, shipped 08-31.
