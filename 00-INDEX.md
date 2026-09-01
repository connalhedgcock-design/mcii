---
id: idx
t: index
v: 2
upd: 2026-08-29
machine: austin
---
# MCII VAULT — CLAUDE ENTRYPOINT

!! THIS VAULT IS WRITTEN FOR CLAUDE, NOT HUMANS. Shorthand is intentional. Do not "clean up" into prose.
!! Human-facing docs live outside the vault (Artifact + 99-SETUP). Keep the split.

## LEGEND
`>` leads to | `∵` because | `∴` therefore | `!` hard constraint/danger | `?` open q | `X` rejected+why | `✓` decided
`~` approx | `@` source | `Δ` change/velocity | `σ` volatility | `→` maps to | `[[x]]` vault link | `TODO:` needs work
conf=N% = my calibrated confidence. Every claim in this vault carries one or is marked `fact:`.

## LOAD ORDER (read top-down on cold start)
1. [[mandate]]      — who I am here. NON-NEGOTIABLE. read first, every time.
2. [[ops]]          — who I'm working with, skill level, failure modes
3. [[constraints]]  — $ cap, legal, machine limits
4. **[[70-AREAS/mcii-overview/OVERVIEW|70-AREAS/mcii-overview/OVERVIEW.md]]** — what MCII actually
   IS, as-built, right now. ! read BEFORE item 8 below — 20-SPEC is the 08-23 PRE-BUILD plan and
   parts of it (React, Postgres, Syncthing) were never built that way; OVERVIEW is current fact,
   20-SPEC is historical intent. see [[70-AREAS/AREAS|70-AREAS/AREAS.md]] for how that tree works.
5. [[base-rates]]   — the numbers that kill bad ideas before they cost money
6. [[grill]]        — every idea in this project, interrogated. THE core doc.
7. [[spec]]         — the reprompt. what we're actually building.
8. [[arch]] [[creds]] [[data-sources]] [[scoring]] [[ui]] [[sync]] — PRE-BUILD PLAN. cross-check
   against 70-AREAS/ and the real code where they disagree; do not treat as current fact.
9. 40-POS/*         — live positions + theses
10. [[decisions]] — LOCKED calls. read before proposing anything. do not re-open a row.
11. 50-LOG/* — trades, forecasts, calibration, dated. for "everything about subject X" instead,
    check `70-AREAS/<subject>/` first — see [[70-AREAS/AREAS|70-AREAS/AREAS.md]].
12. **[[90-TASKS/BOARD|90-TASKS/BOARD.md]]** — what either of them should do next, worst first.
    lanes from D-89. ! `BOARD.md` is DERIVED from `connal.md` + `austin.md`; on a merge conflict
    regenerate it rather than hand-resolving. see [[90-TASKS/README|90-TASKS/README.md]].
13. [[80-WHISPERS/README|80-WHISPERS/]] — his half-formed thoughts, captured raw, plus my
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
