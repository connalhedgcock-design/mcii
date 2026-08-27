---
id: log.20260827b
t: log
v: 1
---
# 2026-08-27 CLOUD COLLECTOR BUILT (P2 started — austin access)

## ! ARCHITECTURE CHANGE: git-as-store REPLACES postgres AND syncthing. supersedes D-04.
- reasoning: a free-tier postgres is STORAGE, not COMPUTE. it would still need GHA to run the collector.
  ∴ postgres = two services where one will do. git repo is both the runner's home and the store.
- ✓ also replaces syncthing for the vault: git works ASYNCHRONOUSLY via github. syncthing needs both machines online SIMULTANEOUSLY.
  for two people who are rarely online together, git strictly dominates. one tool, not two. non-technical operators benefit most.
- ✓ no free-tier auto-pause risk. ✓ versioned history for free. ✓ austin gets everything by cloning.
- concurrency is a non-issue BY CONSTRUCTION: only the cron writes data/. laptops read. laptop high-freq data stays local + gitignored.

## CADENCE — set by GHA free minutes, same discipline as D-28
- private repo = 2,000 free Actions min/mo. ~2min/run > hourly ≈ 1,440/mo. FITS.
- ! more frequent exhausts the allowance mid-month and stops collection ENTIRELY. worse than a coarser baseline.
- laptops cover high frequency (15s) when awake. cloud exists for CONTINUITY not frequency. the 7.8h overnight hole is the thing it removes.
- ? public repo = unlimited minutes, but exposes the watchlist. operator's call, not mine. not taken.

## BUILT
- app/main/cloud-collect.js — headless, runs once, exits. market + social + full screener.
- .github/workflows/collect.yml — hourly cron + workflow_dispatch. concurrency group (two runs appending would interleave lines).
  ! commit step: pull --rebase --autostash, 3 attempts. rebase NOT force ∵ every write is an append; rebase preserves both sets.
  ! permissions: contents:write only.
- data/ — market.jsonl | social.jsonl | scans.jsonl | candidates.jsonl | x-spend.json. README warns not to hand-edit.
- .env.example committed; .env gitignored + verified absent from the index.

## VERIFIED LOCALLY BEFORE IT EVER RUNS REMOTE (same code path)
- CATE $0.06131 liq $4.2M exit $135,463 | NEEGY $0.000666 liq $145k exit $3,707
- social CATE 28 posts/22 people sent +0.406 moderate, 3 spam filtered | NEEGY 38/17 sent +0.001
- scan 60 > 14 tradeable > 10 passed. all four files written.
- ! secret sweep: key absent from data/, .github/, and the git index. .env excluded.

## git initialised, first commit c4c009b, 81 files, 520K, no node_modules, no secrets.
## gh cli installed (2.98.0) ∴ repo creation + secret upload become 2 commands instead of 6 web forms.

## BLOCKED ON OPERATOR (cannot be done for them — needs their github login)
1. `gh auth login`  2. create private repo + push  3. add TWITTERAPI_KEY as an Actions secret
- ! austin's OS still unknown. electron is cross-platform but WINDOWS IS UNTESTED. flag before promising it works for him.

## !! BUDGET GUARD DEFEATED BY DUPLICATION — caught during verification, fixed
- after the cloud collector went live, TWO social collectors were running: local (40min) + cloud (60min).
- ! they keep SEPARATE spend counters. each enforced $12 independently ∴ the guard permitted $24 total.
- measured combined run rate: $16.15/month against a $12 cap. would have surfaced as a surprise bill, not an error.
- ✓ local collector STOPPED + header comment marks it superseded + npm script renamed `collect:local` with a warning.
- ✓ cloud only = $7.56/month = 63% of budget. headroom restored.
- ! GENERAL LESSON: a per-process budget guard is not a budget guard. the cap must be enforced on SHARED state, or
  enforced by there being exactly one collector. chose the latter — simpler and verifiable by `pgrep`.
- ! this is the second time adding a component silently broke an invariant held by an existing one
  (first: geckoterminal rate limits shared across app+collector+screener > shared throttle).
  ∴ when adding any component that consumes a capped resource, check every existing consumer of that cap.

## FIRST CLOUD RUN VERIFIED ON GITHUB'S INFRASTRUCTURE
- run 33076357614, conclusion SUCCESS.
- CATE $0.06081 liq $4.20M exit $151,802 | NEEGY $0.0006406 liq $142,693 exit $3,170
- social CATE 32 posts/21 people | NEEGY 38/17. scan 60 > 13 tradeable > 10 passed.
- committed back as 203b556 "data: collection 2026-08-27 13:22 UTC". data/ files grew. pull works.
- repo: github.com/connalhedgcock-design/mcii (private). secret uploaded, absent from all commits.
