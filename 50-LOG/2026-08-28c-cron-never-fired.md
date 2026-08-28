---
id: log.20260828c
t: log
v: 1
prio: high
---
# 2026-08-28 !! THE HOURLY CLOUD JOB HAS NEVER RUN ON ITS OWN

## WHAT I FOUND (fresh session, verifying the handoff before building on it)
- handoff + [[decisions]] D-41 both state cloud collection runs HOURLY. `gh run list`: **2 runs ever, both
  `workflow_dispatch`. ZERO `schedule` events in 27h.** repo created 08-27 13:20Z, workflow `state: active`,
  actions `enabled: true`, cron `7 * * * *` valid, file on default branch. github simply never fired it.
- fact: the whole record = **4 moments in 27h** (08-27 13:10, 13:21 / 08-28 14:53, 16:02). two of those were local.
  market.jsonl 8 lines. holders-onchain.jsonl **2 lines**.
- ∴ the hourly holder-change alerts (D-56/D-57) have never had two readings to compare and CANNOT have fired.
- ∴ "survives laptops sleeping" — the stated reason git-as-runner beat postgres (D-40) — is **not true today**.

## ! WHY NOBODY NOTICED — same shape as before, fifth instance
- every age shown in the app is of data the app fetched SECONDS AGO. always fresh by construction.
- the one place the shared record's age mattered, index.js:110, silently DROPPED holderTruth when >6h old.
  a stopped collector rendered as an absent panel, identical to a token with no data.
- ! generalised: **a collector with nothing displaying its age is indistinguishable from a broken one.**
  I logged this exact lesson on 08-27 about the scanner and did not apply it to the thing the design leans on hardest.

## ROOT CAUSE (github side) — NOT DETERMINED, and I will not pretend otherwise
- ruled out @gh api: workflow disabled | actions off | wrong branch | invalid cron | private-repo minutes (public now).
- remaining candidate, unproven: github queues scheduled runs best-effort and drops them under load;
  the top of the hour is the busiest slot. `7` is inside it.
- ✓ moved to `37 * * * *`. conf 40% that alone fixes it. cheap, cannot hurt.
- ! this is a guess and is treated as one > the real fix is not a better minute, it's not trusting a scheduler
  we don't own. the staleness display is what makes the next failure loud instead of silent.

## SHIPPED
- shared/collection.js — `health(dataDir)`: newest ts across every file in data/ (+ holder-truth checkedAt).
  ok <2h | late <6h | stalled >6h | unknown if empty. future-dated rows ignored ∵ a skewed clock would
  otherwise hide a dead job behind a timestamp that never ages.
- ipc `collection:health` > banner above the alert strip, visible in EVERY view, plain words, no jargon
  (test asserts the copy contains no cron/workflow/pipeline).
- reads `ok` right now only ∵ a manual run 28min ago. it goes amber at 2h, red at 6h. ∴ **the display itself
  is the experiment**: if :37 works it stays green, if not it goes red tonight and says so.

## TESTS 103 > 113 (+10)

## ! OPEN
- if :37 also produces zero scheduled runs > cloud cron is dead as a foundation. options then, unranked, unbuilt:
  laptop launchd job w/ wake handling | free external trigger hitting workflow_dispatch | accept holes + say so.
- holder-truth.json has `jupiter: null` + `driftPct: null` ∴ D-54's "confirm the cheap source still deserves
  trust" produced NO comparison last run. jupiter holderCount returned nothing. not yet diagnosed.
