---
id: area.idx
t: area-index
v: 1
upd: 2026-08-29
machine: austin
---
# AREAS — persistent knowledge base, organized by subject not by date

!! read this before touching anything under 70-AREAS/. this is where cross-session knowledge lives
so no future session has to be re-taught the app, or re-discover a bug that was already found.

## WHY THIS EXISTS, AND HOW IT DIFFERS FROM WHAT ALREADY EXISTED
- `50-LOG/` is CHRONOLOGICAL — one file per day. great for "what happened on 08-28", bad for
  "everything about the Observatory" six weeks from now, which is scattered across a dozen files.
- `20-SPEC/` is the PRE-BUILD PLAN, written 08-23 before any code existed. parts of it are now
  WRONG — it specs React (built: vanilla JS), Postgres (built: git + jsonl), a device-local SQLite
  tier (built: nothing, the sidecar is one JSON file). !! do not trust 20-SPEC for "what IS the
  app" — trust it only for "what was originally intended", and check AREAS/ or the real code first.
- `70-AREAS/` (this) is ORGANIZED BY SUBJECT and updated in place as a subject grows. "what is the
  Observatory" > read `observatory/`, not forty files in 50-LOG.

## THE SCHEMA — every area follows this shape
```
70-AREAS/<area-name>/
  README.md        <- what this is, current status, one screen. links everything else below.
  LOG.md            <- APPEND-ONLY. dated entries: what was built/found > root cause > fix > tests.
                       same discipline as 50-LOG (quote the operator verbatim, log the root cause
                       not the symptom, log what was NOT built too).
  <subfolder>/      <- ONLY once an area is big enough to need it. e.g. observatory/design/ and
                       observatory/functionality/ exist because the Observatory is a whole UI
                       system; a one-bug area (multichain-market-data/) does not get subfolders.
```
Copy this shape for a new area. Do not invent a different one per area — the whole point is that
"where do I look for X" has one answer across the vault.

## AREAS THAT EXIST
- [[mcii-overview/OVERVIEW]] — what MCII actually is, end to end, as-built. READ THIS FIRST on a
  cold session, before 20-SPEC, before asking the operator to re-explain anything.
- [[observatory/README]] — the spatial 3D control-room UI (`renderer/station/`). design principles
  in `design/`, what each instrument does in `functionality/`, full build+bug history in `LOG.md`.
- [[multichain-market-data/README]] — market data adapters are Solana-first but not Solana-only;
  the safety/exit-sim/chart services genuinely are Solana-only. one incident, one area.
- [[j7-tracker/README]] — a third-party token-deployment site, embedded as a plain isolated
  `<webview>` tab. NOT a data integration — read this before wiring any of their "API keys" in.

## RULES (restated from 50-LOG's write rules, because this is the doc that gets skipped)
- `LOG.md` is APPEND-ONLY. never delete an entry, never rewrite history in place. a belief that was
  wrong at the time is still the record of what was believed and why — that is the whole value of
  a log over a wiki page.
- quote the operator VERBATIM when an entry starts from something he said. paraphrase loses the
  register, and the register is often half the information.
- log the ROOT CAUSE, not the symptom. when two symptoms share one cause, say so explicitly — that
  sentence is usually the most useful one in the entry.
- ! every new file gets `machine:` in frontmatter (`austin` or `connal`), and every LOG.md entry
  opens with a `- machine:` line. two people editing one vault means provenance is not optional —
  it is how a disagreement gets discussed instead of re-litigated from scratch.
- new area → copy the schema above into a new folder. update the "AREAS THAT EXIST" list here in
  the same commit. an area not linked from this file does not effectively exist.
