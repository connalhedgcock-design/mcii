---
id: task.idx
t: task-index
v: 1
upd: 2026-08-31
machine: connal
---
# TASKS — who does what next, and why that order

!! SAME PRINCIPLE AS [[80-WHISPERS/README|80-WHISPERS]]: capture is free, organizing is MY job.
Connal and Austin dump plain lines. I assign ids, priorities, lanes, and keep the board honest.
! if either of them has to think about format to add a task, this system has failed.

## FILES — and why they are split this way
```
90-TASKS/
  README.md    <- this. the priority bands + lane rules.
  BOARD.md     <- ! DERIVED. my file. everything, both people, sorted by priority. regenerated.
  connal.md    <- his queue. HE edits this freely.
  austin.md    <- austin's queue. HE edits this freely.
```
! THE SPLIT IS ABOUT GIT, NOT BUREAUCRACY. two people editing one shared task file on a git-synced
vault produces merge conflicts on exactly the file they both touch most. one file per person means
neither can conflict with the other. ∵ the sync is git and there is no locking.
! `BOARD.md` is DERIVED — on a merge conflict, do not hand-resolve it. throw both sides away and
regenerate from the two personal files. that property is the whole reason it is a separate file.

## PRIORITY BANDS — earned from this project's own history, not a generic P0-P4
- **P0 · MONEY** — real money can be lost right now. a held coin is rugging, an alert is broken, an
  exit number is wrong. ∵ [[decisions]] D-70: bad news about a coin they hold outranks everything.
- **P1 · SILENTLY WRONG** — the system is showing something false, or could, AND NOBODY WOULD
  NOTICE. ! this band exists because it is this project's single most repeated defect: D-60, D-63,
  D-77, D-85, D-87 and the 08-29 scanner hang are all the same failure — something broken that
  looked exactly like something working. a silent wrong outranks a loud broken thing, always.
- **P2 · BLOCKED** — someone cannot proceed until this is done, or it blocks the other person.
  ! a task that blocks the OTHER person outranks one that only blocks yourself.
- **P3 · BUILD** — a real improvement. nothing is broken or lying; this makes it better.
- **P4 · LATER** — good idea, not now. ! never delete these, same rule as rejected ideas.

### how to actually assign one — walk it in order, stop at the first yes
1. can this cost real money in the next 24h? → **P0**
2. could the app tell them something false without either of them noticing? → **P1**
3. is someone stuck until it is done? → **P2** (higher within P2 if it blocks the other person)
4. does it change what gets built or what they can see? → **P3**
5. otherwise → **P4**
! do NOT invent sub-numbers (P1.5, P2a). the bands are coarse on purpose — false precision in a
priority is the same anti-pattern as "hype score 73.4". [[mandate]]

## LANES — from D-89, `10-CTX/ops.md`. not a hard wall.
- **@connal** — scanner effectiveness, what the collected data MEANS, any analysis/scoring algorithm.
- **@austin** — the app itself: bugs, new rooms/features, UI, the Observatory, Electron/renderer.
- **@both** — genuinely straddles. ! this is a REAL category, not a cop-out — D-89 says the lanes
  overlap constantly (a scanner bug often IS an app bug). a task marked @both needs a call on who
  drives BEFORE work starts, not a silent assumption.
- **@unclear** — I could not tell. ! surface these, never guess an owner. guessing wrong wastes the
  wrong person's evening.
! infrastructure (cloud collector, the alerter, CI) belongs to whoever's WORK it serves, not to a
third lane — decide by consequence, not by which file it lives in.

## TASK LINE FORMAT — mine to maintain, not theirs to type
```
- [ ] T-007 P1 @connal · one line, plain english · why: <the consequence> · [[link]]
```
- `T-NNN` zero-padded, never reused, assigned by me. ∵ same reason whispers get ids — a task nobody
  can reference cannot be discussed.
- `why:` is REQUIRED and is the consequence, not a restatement. "why: the alerter goes quiet and
  nobody finds out" is a why. "why: it is important" is not — delete and rewrite it.
- done → move to `## DONE` at the bottom of that person's own file with the date. ! never delete.
  the done list is the honest record of velocity, and it lives in the personal file so completing a
  task never touches a shared one.

## RULES
- ! a P0 or P1 goes in the chat too, not just the board. a critical task nobody reads is a decoration.
- ! staleness is information. a P3 untouched for 3+ weeks is usually a P4 that nobody wanted to
  admit — demote it and say so, rather than letting the board fill with permanent good intentions.
- a task that is really a DECISION goes to [[decisions]] as a D-NN and the task links to it.
  ∵ "decide X" is not work, it is a call, and calls have a different home and different rules.
- a whisper that becomes actionable becomes a task; the whisper stays put with a link both ways.
  see [[80-WHISPERS/README]].
- ! I keep the board current WITHOUT being asked when I finish something that was on it. an
  out-of-date board is worse than none — they will trust it and be wrong.
