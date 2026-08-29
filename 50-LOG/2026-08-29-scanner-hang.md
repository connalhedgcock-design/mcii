---
id: log.20260829
t: log
v: 1
prio: high
---
# 2026-08-29 !! THE COLLECTOR FROZE FOR 3H46M — AN UNTIMED RPC CALL, NOT THE SCHEDULER

## WHAT CONNAL FOUND
- asked whether the scanner picked up data while his computer was off. checked `data/` commits, not
  the vault's own claim of success: last one at **00:10 UTC**, now 03:56 — a 3h46m gap.
- `gh`-equivalent (Actions API): the cron IS firing, on time, every hour at `:37` — 00:37, 01:37,
  02:37, 03:37 all created on schedule. **that part is fixed** (see 2026-08-28c). the failure is
  downstream of the trigger, not the trigger itself.

## ROOT CAUSE
- run #6 (started 22:37) did its first two hourly passes fine (commits at 23:08, 00:10), then never
  committed again — but GitHub still showed it `in_progress` hours later. it hung, not crashed.
- `main/adapters/onchain.js: rpc()` called Solana's public RPC with a **raw `fetch()`, no timeout,
  no AbortController** — the one adapter in the whole project that didn't go through
  `http.js: getJSON()`, which gives every other call a 20s timeout + backoff. this RPC call is
  already documented as heavy (~62MB, ~6s normally); a public endpoint stalling mid-response had
  nothing to stop it, so the Node process just sat there. forever, as far as GitHub could tell.
- ! compounding design flaw, independent of the bug above: `collect.yml`'s concurrency group only
  allows ONE run of "collect" at a time, and the workflow itself looped internally for up to 6
  hours per firing (a workaround from when the scheduler looked broken — see 2026-08-28c). so one
  hang didn't cost one hour, it **blocked every scheduled trigger behind it**: runs #7, #8, #9, #10
  all queued, then each got silently bumped/cancelled by the NEXT hourly trigger before ever
  running. nothing was collected from 00:10 to 03:56 and nothing said why.
- `cloud-collect.js` itself is headed "runs once and exits" — the 6-hour loop in the workflow YAML
  directly contradicted the script's own contract. that mismatch is what turned a 30-second-fixable
  bug into a multi-hour outage.

## FIX
- `onchain.js: rpc()` now goes through `getJSON()` (extended with `method`/`body` support), 30s
  timeout, 1 retry. this exact class of call can no longer hang the process.
- `collect.yml`: dropped the 6-hour internal loop — one trigger, one pass, matching what the script
  already claimed to do. `timeout-minutes` 355 → 15, so a genuine hang self-terminates fast instead
  of camping on the concurrency lock for most of a day.
- `concurrency.cancel-in-progress` false → **true**. a stuck run now gets replaced by the next
  hourly trigger automatically instead of queuing behind it and blocking everything. this is the
  actual fix for "one bug takes down the whole scanner for hours" — the timeout fix stops THIS
  hang, cancel-in-progress stops the NEXT unknown one from cascading the same way.
- verified live: cancelled the hung run (#6) and the run it had queued-then-orphaned (#11, still on
  the old code), then fired a fresh `workflow_dispatch` (#12) on the merged fix. **run #12
  completed successfully in ~2 minutes** (`data: collection 2026-08-29 04:07 UTC`) — a real pass,
  end to end, on the fixed code.

## WHY NOBODY CAUGHT THIS SOONER
- same shape as 2026-08-28c and the HANDOFF's list of "errors masquerading as idle": the run showed
  `in_progress` in GitHub's UI, which reads as "working," not "stuck." nothing distinguishes a slow
  job from a dead one without checking wall-clock time against what a healthy pass actually costs.
- the vault's own 2026-08-28h log claimed "the schedule fires now" as an unqualified win right before
  this happened — true about the trigger, silent about whether the triggered run ever finishes.
  **firing on schedule and completing are different claims; log them separately from now on.**

## OPEN
- `data/watchlist.json` merge conflict handling during the collector's `git pull --rebase` step has
  never been exercised under real concurrent writes from two laptops + the cloud job at once — worth
  watching once collection is reliably hourly again.
- D-61's two-week reliability bar for cron is still open; today only adds evidence, not closure.
