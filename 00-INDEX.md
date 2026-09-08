---
id:
t: index
v: 3
upd: 2026-09-07
machine: connal
---
# MCII VAULT — CLAUDE ENTRYPOINT

!! THIS VAULT IS WRITTEN FOR CLAUDE, NOT HUMANS. Shorthand is intentional. Do not "clean up" into prose.
!! Human-facing docs live outside the vault (Artifact + 99-SETUP). Keep the split.

## LEGEND
`>` leads to | `∵` because | `∴` therefore | `!` hard constraint/danger | `?` open q | `X` rejected+why | `✓` decided
`~` approx | `@` source | `Δ` change/velocity | `σ` volatility | `→` maps to | `[[x]]` vault link | `TODO:` needs work
conf=N% = my calibrated confidence. Every claim in this vault carries one or is marked `fact:`.

## CONTEXT ROUTING
On a cold start, read `10-CTX/operator-profile.md` and `10-CTX/mandate.md`, then use Graphify to
locate task-specific sources. The numbered list below is the order for widening the read when more
context is needed; it is not a requirement to load all fourteen items for every task. Accuracy wins
over token savings: widen immediately for conflicts, important uncertainty, money decisions,
project direction, or anything a narrow read cannot support.

## LOAD ORDER (when widening is needed)
1. [[10-CTX/operator-profile|operator-profile]] — project identity + how to solve every task. NON-NEGOTIABLE.
2. [[mandate]]      — who I am here. NON-NEGOTIABLE. read every time.
3. [[ops]]          — who I'm working with, skill level, failure modes
4. [[constraints]]  — $ cap, legal, machine limits
5. **[[70-AREAS/mcii-overview/OVERVIEW|70-AREAS/mcii-overview/OVERVIEW.md]]** — what MCII actually
   IS, as-built, right now. ! read BEFORE item 8 below — 20-SPEC is the 08-23 PRE-BUILD plan and
   parts of it (React, Postgres, Syncthing) were never built that way; OVERVIEW is current fact,
   20-SPEC is historical intent. see [[70-AREAS/AREAS|70-AREAS/AREAS.md]] for how that tree works.
6. [[base-rates]]   — the numbers that kill bad ideas before they cost money
7. [[grill]]        — every idea in this project, interrogated. THE core doc.
8. [[spec]]         — the reprompt. what we're actually building.
9. [[arch]] [[creds]] [[data-sources]] [[scoring]] [[ui]] [[sync]] — PRE-BUILD PLAN. cross-check
   against 70-AREAS/ and the real code where they disagree; do not treat as current fact.
10. 40-POS/*         — live positions + theses
11. [[decisions]] — LOCKED calls. read before proposing anything. do not re-open a row.
12. 50-LOG/* — trades, forecasts, calibration, dated. for "everything about subject X" instead,
    check `70-AREAS/<subject>/` first — see [[70-AREAS/AREAS|70-AREAS/AREAS.md]].
13. **[[90-TASKS/BOARD|90-TASKS/BOARD.md]]** — what either of them should do next, worst first.
    lanes from D-89. ! `BOARD.md` is DERIVED from `connal.md` + `austin.md`; on a merge conflict
    regenerate it rather than hand-resolving. see [[90-TASKS/README|90-TASKS/README.md]].
14. [[80-WHISPERS/README|80-WHISPERS/]] — his half-formed thoughts, captured raw, plus my
    `SYNTHESIS.md` connecting them to each other and to live work. ! whispers are INPUTS, not
    claims — the mandate's falsifier rule is suspended for a raw whisper and reattaches the moment
    one is used to justify building something.

## STATE
- !! phase line below was WRONG for weeks ("nothing built, no code") while a full Electron app,
  the Observatory spatial UI, Orion, and a working git-sync workflow existed. corrected 08-29
  (machine: austin). if you are reading a stale copy of this file, trust 70-AREAS/ over this line.
- phase: BUILT AND IN DAILY USE. Electron app in `app/`, two operators (Austin + Connal), synced by
  git. see [[70-AREAS/mcii-overview/OVERVIEW|70-AREAS/mcii-overview/OVERVIEW.md]] for what exists.
- vault root = `~/Documents/MCII` on WHICHEVER machine you're on (Austin's and Connal's paths
  differ by username; do not hardcode one).
- app code → `./app/` (kept out of Obsidian's indexer via `userIgnoreFilters` — node_modules kills it)
- ! `.obsidian/workspace.json` must stay gitignored — it is per-person UI state, not shared data.
- next action gate that mattered at SPEC phase (read GRILL before any code) is DONE and moot now;
  the live gate is: read the OVERVIEW above before proposing anything that already exists.
- !! RUN `./check-decisions.sh` BEFORE STARTING ANY NEW WORK. It lists decisions that were LOCKED
  and never built. Those get built FIRST, ahead of anything new, or the row gets reopened on
  purpose with a reason. Added 2026-09-01 on Connal's instruction ("things that get locked but not
  built should be built automatically") after D-95 and D-96 sat locked-and-absent for a day while
  the vault read as though they existed. ! a locked row with no code behind it is worse than an
  open question — an open question gets revisited, a false certainty does not.
- ! AND CHECK `git log --oneline -15` BEFORE AUDITING OR PROPOSING ANYTHING. added 2026-09-01 after
  a full social-collection audit was run against a state the other operator had already rebuilt
  hours earlier — the files were read correctly, the COMMITS were not. two people in one folder
  means "I read the current files" is not the same as "I know what just changed". costs 2 seconds.
  ! the operator apologised for not mentioning it; that is the wrong direction. the check is mine.

## WRITE RULES (me)
- one fact per file where it's a memory; one topic per file where it's spec
- update `upd:` on every edit. bump `v:` on semantic change.
- never delete a rejected idea — move to `X` block w/ reason. rejected ideas resurface; keep the receipt.
- log every prediction w/ prob + resolution date > 50-LOG. no exceptions. calibration is the only proof this project works.
