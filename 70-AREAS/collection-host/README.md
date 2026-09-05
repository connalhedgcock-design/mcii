---
id: area.collection-host.readme
t: area-readme
v: 1
upd: 2026-09-01
machine: connal
---
# COLLECTION HOST — the server that actually collects the data

!! IF YOU ARE A NEW SESSION AND WONDERING WHERE `data/` COMES FROM: not GitHub Actions any more.
A small Hetzner server runs it on a systemd timer. Moved 2026-09-01, D-98.

## HOW TO REACH IT
```bash
ssh mcii-server
```
! The IP is deliberately NOT in this repo — the repo is public (D-92), and publishing the address
of a box holding an API key is free reconnaissance for no benefit. The alias lives in Connal's
local `~/.ssh/config` (untracked); the address itself is in the Hetzner console. Austin needs his
own key added before he can reach it — see UNFINISHED below.

## WHAT IT IS
- Hetzner CX-line, 2 cores / 4GB / 40GB, Ubuntu 26.04, Helsinki. ~€4/mo, inside the $30 ALL-IN cap
  (`10-CTX/constraints.md`), which is now ~$13 X + ~€4 server.
- `/opt/mcii` — a normal clone of this repo, on `main`.
- `mcii-collect.timer` → `mcii-collect.service` → `/usr/local/bin/mcii-collect`, at `*:12,42`.
  Same slots the workflow used. One pass per firing, then exit (D-88).
- Pushes with a **deploy key scoped to this one repo**, not an account token. Read-write, listed
  under the repo's Deploy keys as `mcii-server`.

## WHY IT EXISTS  (D-98)
D-61 set the bar for trusting GitHub's scheduler at "proves reliable over two weeks". It did not
clear it. 08-27..09-01: **five blackouts, ~13 hours missing from a 4.6-day record, and only one was
noticed at the time** — the rest were found days later by reading the data file.
- four were runs CANCELLED mid-flight by the next trigger. That is `cancel-in-progress` doing what
  we asked after the 08-29 hang; the fix traded one cascading outage for repeated silent partial
  losses. ! a cancelled run writes nothing and says nothing.
- one was GitHub never firing at all for ~3 hours. No config fixes that.
∴ this is D-61's own reopen trigger firing as designed, not a whim.

## ! THE ONE RULE
**Never run both.** The workflow's cron is commented out, `workflow_dispatch` kept as a manual
backup. Two collectors would collect the same data twice, pay twitterapi.io twice for it, and race
each other pushing to `data/`.

## CHECKING IT IS ALIVE
```bash
ssh mcii-server 'systemctl list-timers mcii-collect.timer --no-pager'
ssh mcii-server 'journalctl -u mcii-collect.service --since "-3 h" -o cat | grep -E "^(pushed|nothing new|ERROR|WARN)"'
```
! `NEXT` shows blank while a pass is mid-flight — that is normal, not a stopped timer. Check
`systemctl is-active mcii-collect.service` before concluding anything is wrong.
The honest check is the same one that found the original problem: **look at the commit timestamps
in `data/`**, not at whether the timer claims to be enabled.

## BUGS ALREADY HIT HERE, SO NOBODY RE-DEBUGS THEM
- ! **systemd does not set `HOME`.** `git config --global` therefore did not exist for the service,
  `git commit` failed, and the script reported **"nothing new to commit"** — a real error wearing
  the costume of a normal outcome. Same family as D-85 and the 08-29 hang. Fixed two ways: identity
  passed inline with `git -c user.name=... -c user.email=...` (as the workflow always did), and
  `Environment=HOME=/root` in the unit, which `ssh` also needs to find the deploy key for the push.
- ! the first version of the script wrapped the commit in `2>/dev/null`. **That is what turned the
  failure into a plausible-sounding success line.** Errors are no longer swallowed; a failed commit
  or push now exits non-zero and says which.
- Hetzner does not attach an SSH key to a server after creation — only at creation. Getting it
  wrong means falling back to an emailed root password.

## SECURITY POSTURE
- Key-only SSH. Password auth is **off** (`/etc/ssh/sshd_config.d/99-mcii.conf`) — a root password
  was exposed in a chat log on 09-01 and disabling password login is what actually neutralised it.
- `ufw` allows OpenSSH only. Nothing else is reachable.
- `unattended-upgrades` on, so security patches apply without anyone remembering to.
- `TWITTERAPI_KEY` lives in `/etc/mcii.env`, mode 600, read via the unit's `EnvironmentFile`.
  ! NOT in `app/.env` — this project has no `dotenv`, so a `.env` there would be silently ignored.

## UNFINISHED
- `?` **Austin has no access.** His public key needs adding to `/root/.ssh/authorized_keys` before
  he can debug anything here. Until then this box is a single-person dependency.
- `?` **Nothing tells anyone when collection stops.** The whole reason for this move was that
  blackouts were invisible for days, and that is still true — the failure is just less likely now.
  The Telegram alerter (`cloudflare/telegram-alerts/`) already reaches their phones and could carry
  a staleness warning. ! until that exists, this area has fixed the frequency of silent failure and
  not its silence.
- `?` no off-server backup of `/etc/mcii.env`. If the box is lost the key must come from
  twitterapi.io again — recoverable, but know it before deleting anything.

## DATA-FILE CONFLICTS SOLVE THEMSELVES NOW, 2026-09-05
The host collects every 30 minutes while a laptop is also working, so both sides routinely append
different real rows to the same `data/*.jsonl`. Git correctly refused to guess, and `share.sh`
stopped dead — hit for real on 09-05 with 25 host collection commits against a laptop's own.
- ! "whose lines win" is the WRONG QUESTION for these files. They are append-only logs of things
  that really happened on two machines. Both sides are true; dropping either puts a hole in the
  record, and this area's own D-98 history says holes are the expensive failure.
- ✓ `tools/merge-data.py`, registered as a git merge driver via `.gitattributes` and installed
  automatically by `share.sh` on every run (so neither machine needs manual setup). Keeps every
  line from both sides, drops exact duplicates, re-sorts by timestamp. `holder-truth.json` is a
  per-coin snapshot rather than a log, so the NEWEST reading per coin wins instead.
- ! DELIBERATELY LIMITED TO THE DATA FILES. Verified both ways before trusting it: a two-sided
  data conflict merges cleanly with every row preserved and correctly interleaved by time, AND a
  conflict in real code or a vault note still stops and asks. Two people editing the same function
  is a genuine disagreement and must never be auto-resolved.
