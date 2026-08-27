---
id: idx
t: index
v: 1
upd: 2026-08-23
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
4. [[base-rates]]   — the numbers that kill bad ideas before they cost money
5. [[grill]]        — every idea in this project, interrogated. THE core doc.
6. [[spec]]         — the reprompt. what we're actually building.
7. [[arch]] [[creds]] [[data-sources]] [[scoring]] [[ui]] [[sync]] — build detail
8. 40-POS/*         — live positions + theses
9. [[decisions]] — LOCKED calls. read before proposing anything. do not re-open a row.
10. 50-LOG/* — trades, forecasts, calibration

## STATE
- phase: SPEC. nothing built. no code. no node/npm on host.
- vault root = /Users/connalhedgcock/Documents/MCII (.obsidian lives here)
- app code → ./app/ (add to obsidian userIgnoreFilters, else node_modules destroys indexer)
- ! next action gate: operators must read GRILL + answer OPEN-Q block before any code

## WRITE RULES (me)
- one fact per file where it's a memory; one topic per file where it's spec
- update `upd:` on every edit. bump `v:` on semantic change.
- never delete a rejected idea — move to `X` block w/ reason. rejected ideas resurface; keep the receipt.
- log every prediction w/ prob + resolution date > 50-LOG. no exceptions. calibration is the only proof this project works.
