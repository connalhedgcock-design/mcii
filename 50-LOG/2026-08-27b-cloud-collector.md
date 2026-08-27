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
