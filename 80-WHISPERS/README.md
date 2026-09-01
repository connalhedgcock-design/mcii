---
id: whisper.idx
t: whisper-index
v: 2
upd: 2026-09-01
machine: connal
---
# WHISPERS — half-formed thoughts, captured before they evaporate

!! THE POINT: a thought Connal has once and does not write down is gone. Whispers exist so the
cost of catching one is ~zero. Everything expensive (organizing, connecting, judging) is MY job,
not his. ! if capture ever requires him to think about format, this system has failed.

## THE ONE RULE FOR THEM
Type the thought on a new line in your own inbox, done. No date, no tags, no frontmatter, no
complete sentences. Fragments are fine. Contradicting an earlier whisper is fine.

Three ways in, all equivalent:
- type it straight into your own inbox file
- `/whisper <thought>` in chat
- ! **any message starting with `whisper:`** — this is the one actually used. it is a capture
  instruction, NOT an invitation to discuss. append verbatim, confirm in one line, stop. pinned in
  `CLAUDE.md` §2 so it survives a session that never reads this file.

! ALWAYS APPEND TO THE INBOX OF WHOEVER IS SPEAKING (`machine:` tells you which). never merge the
two, never move a whisper between them — who thought it is part of the data, same as D-89 makes
provenance non-optional everywhere else in this vault.

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

## !! ROUTING — every whisper belongs to exactly ONE project folder
Added 2026-09-01 on Connal's instruction ("make sure that you are able to identify what specific
project each whisper is pertaining to and organize them in folders based on that").

**The rule, in order. Stop at the first that fits:**
1. Is it about how RAW DATA BECOMES A READ — discovery, attention, per-tweet extraction, scoring,
   safety, what a number means? → `analysis-algorithm/`
2. Is it about WHAT REACHES THEIR PHONES and what it says? → `alerts/`
3. Is it about WATCHING NAMED WALLETS rather than a coin's own numbers? → `whale-tracking/`
4. Is it about HOW THE TWO OF THEM WORK rather than what gets built? → `ways-of-working/`
5. None of the above → leave it UNFILED in the map below with a one-line note saying why nothing
   fits. ! do NOT invent a folder for a single whisper that has no project. An empty-ish folder
   reads as a live workstream and there are already two thin ones here.

**One whisper, one owning folder.** A thread that needs a whisper it does not own REFERENCES it
under its own "owned by other threads" heading. ∵ the same thought in two homes means a reader who
finds both trusts neither — the same rule `analysis-algorithm/README` opens with.

**The inbox is never restructured.** Whispers stay where they were typed, in capture order,
verbatim. Folders hold my gathering and expansion; the inbox holds his words. ! the only thing I
ever add to an inbox line is the `w-NNN` id.

### CURRENT MAP  — DERIVED from the folder READMEs, which are the authority
| id | folder | one line |
|---|---|---|
| w-001 | `analysis-algorithm/` | "cant get out" is not a useful measure at their position sizes |
| w-002 | `analysis-algorithm/` | make the ">=3 different people" discovery mechanism more effective |
| w-003 | `alerts/` | a notification must carry the analysis, not just a number (locked, D-96) |
| w-004 | `whale-tracking/` | wallet / whale tracking is wanted and not built |
| w-005 | `analysis-algorithm/` | liquidity draining is the present tense; social going quiet is a guess |
| w-006 | `ways-of-working/` | Austin owns presentation, Connal owns functionality, on every feature |
| w-007 | `analysis-algorithm/` | direction and confidence are two stages; count the trials; pick one data surface |
| *(pending)* | `analysis-algorithm/` | real-world events → market moves; and detecting/weighting posts by high-pull accounts and whales |
! if this table and a folder README disagree, the README is right and this table is stale.
Regenerate it rather than hand-fixing one row.

## FILES
```
80-WHISPERS/
  README.md          <- this. how the system works.
  INBOX-connal.md    <- ! raw captures, append-only, zero-friction. HIS file. I only ever ADD ids.
  INBOX-austin.md    <- same, Austin's. ! one file per person, never one shared one — two people
                        appending to the same file conflicts on exactly the file they both use most.
  SYNTHESIS.md       <- the connection map, across BOTH inboxes. MY file, rewritten each pass.
  w-NNN-slug.md      <- one file per PROMOTED whisper — only once it has earned expansion.
  analysis-algorithm/  <- THREAD. how raw data becomes a read. the thick one.
  alerts/              <- THREAD. what reaches their phones and what it says.
  whale-tracking/      <- THREAD. watching named wallets. ! thin, n=1.
  ways-of-working/     <- THREAD. how the two of them work. ! not a build project.
! the old rule here said threads are created "only when several whispers converge, never
pre-emptively". SUPERSEDED 2026-09-01 by Connal asking for a folder per project outright. I raised
the cost — thin folders read as live workstreams — and the folders were still wanted, so each thin
one now says `! THIN THREAD, n=1` in its own first lines instead. The receipt, per the vault's
never-delete-a-rejected-idea rule: the concern was overconfidence in what is actually one sentence,
and the mitigation is the warning label, not the absence of the folder.
```
! Ids are a SINGLE sequence across both inboxes (w-001, w-002 …), never per-person. ∵ the point of
an id is to reference a thought in one place; two sequences would collide the first time both
files reached w-003, and the collision would be silent.

! Whispers sync through git like the rest of the vault, so each of them sees the other's. The
`/whispers` pass reads both — a connection BETWEEN their two inboxes is the most interesting kind
this system can find, because it means they arrived at the same thing independently.

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
