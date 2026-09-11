---
id: log.20260911
t: log
v: 1
prio: high
machine: connal
---
# 2026-09-11 !! THE COLLECTION HOST WAS STUCK 22H — IT NEVER REGISTERED THE DATA MERGE DRIVER

## WHAT CONNAL FOUND
- reported "the scanner is down". No dashboard said so -- exactly the open risk the
  `70-AREAS/collection-host/README.md` UNFINISHED section already named: "nothing tells anyone
  when collection stops."

## WHAT WAS ACTUALLY WRONG
- last real "data: collection" commit on GitHub was **2026-09-10 16:36 UTC** (093e910), ~8h stale
  when checked. GitHub's own standby workflow (`collect.yml`) never fired to cover it, because its
  guard just checks "when did anything last touch `data/`" -- and the laptop's own unrelated
  `data/x-spend.json` pushes (12:56, 12:52 local) kept resetting that clock even though they carry
  no real market/social collection. The guard's liveness signal and "the collector actually ran"
  are different claims; this is the same shape of mistake 2026-08-29 already flagged about
  "firing on schedule" vs "completing," just one layer further out.
- the REAL collector is the Hetzner box (`mcii-server`, D-98). Its checkout hit a genuine conflict
  in `data/x-spend.json` during its post-collection `git pull --rebase --autostash` at **2026-09-10
  02:44 UTC** and got stuck mid-rebase. Every 30-min timer firing after that collected real data
  and committed it locally (in detached HEAD, since the branch was mid-rebase) but could never
  push -- **43 real collection passes, ~22 hours, sitting only on that one box.**

## ROOT CAUSE
`tools/merge-data.py` (written 2026-09-05, extended 2026-09-10) exists specifically so two
machines collecting into the same files never stops on a raw conflict -- but it only becomes
active once something runs `git config merge.mcii-data.driver ...` in that checkout. `share.sh`
does that for the laptop, every time it runs. **Nothing did it for the server.** `mcii-collect`
never called it. So the server's checkout was one real overlapping edit away from exactly this
outcome the whole time D-98 has existed, and just hadn't hit one yet.

Compounding gaps found while recovering, all real, all now fixed:
- `.gitattributes` used `data/*.jsonl`, which does **not** match `data/history/*.jsonl` -- those
  files were never covered even on the laptop.
- `50-LOG/signals-*.jsonl` / `forecasts-*.jsonl` were collected (`mcii-collect` explicitly `git
  add`s the signals glob) but had no merge rule at all.
- Several point-in-time snapshot files (`growth-quality.json`, `rescore.json`, `query-runs.json`,
  `social-latest.json`, `notable-seen.json`, `ticker-collisions.json`) had no rule either --
  `holder-truth.json`/`wallet-watch-state.json` got one each by name as they were hit; this class
  of file kept growing faster than that.
- The 22h-old `git rebase --abort`'s autostash-pop briefly reverted `tools/merge-data.py` itself
  to its pre-09-10 copy (no `merge_spend`) during recovery -- caught because the very next conflict
  it should have auto-resolved didn't. Restored from `origin/main` before re-resolving.

## FIX
- Registered the driver directly in the server's git config (immediate), and added the same
  `git config merge.mcii-data.*` lines `share.sh` already had into `/usr/local/bin/mcii-collect`
  itself, so a fresh clone of this box self-configures the way the laptop always has.
- `.gitattributes`: `data/*.jsonl` → `data/**/*.jsonl`; added the two `50-LOG/*.jsonl` globs; added
  a blanket `data/*.json` for the snapshot-file class.
- `tools/merge-data.py`: added `merge_snapshot_json`, a generic newest-wins fallback (by whichever
  side has the later `checkedAt`/`updatedAt`/`generatedAt`/`at`/`ts` field, else `theirs` --
  documented as a real limitation, not a guess dressed up as a decision) instead of hardcoding one
  more filename every time this shape recurs.
- `mcii-collect` now also stages `50-LOG/forecasts-*.jsonl` -- it was being written on the server
  the whole time and had no path to ever get committed by this script.
- Recovered all 43 stuck commits: branched off the server's detached HEAD before touching
  anything, aborted the dead rebase, merged the backlog against `origin/main` (now that the driver
  actually runs), resolved the handful of conflicts the driver still couldn't cover automatically
  (the snapshot-json class, by hand, same newest-wins rule now built in), pushed. `x-spend.json`
  reconciled through the existing delta-merge, landing at $7.34 -- **never below** what either side
  already recorded, satisfying D-90's own no-underreport rule.
- Verified live: manually fired `mcii-collect.service` after the fix landed -- pulled, collected,
  committed, pushed clean in ~2 minutes, no conflict. `git log` on the laptop shows the same
  commit within seconds of the push.

## STILL OPEN
- The GH Actions guard's liveness check (`git log -1 -- data/`) still can't distinguish "the real
  collector ran" from "literally anything touched a file under data/". It didn't cause this
  outage, but it's why the 22h gap went unflagged by the one thing watching for it -- worth a
  narrower guard (e.g. check for a commit actually authored by `mcii-collector`) if this class of
  silent staleness matters enough to invest in twice.
- `/usr/local/bin/mcii-collect` and the systemd unit files still live only on the server, not in
  this repo (per collection-host README's own UNFINISHED list) -- today's fix to that script had
  to be hand-deployed over ssh rather than reviewed and pushed like everything else.
- The Telegram alerter (`cloudflare/telegram-alerts/`) still doesn't carry a staleness warning,
  the same gap the collection-host README already named. This incident is a second, sharper data
  point for building it.
