---
id: log.20260826f
t: log
v: 1
---
# 2026-08-26 BACKFILL BUILT, TESTED, ABANDONED — live collector running instead

## ! I PROPOSED BACKFILL, BUILT IT, AND IT DOESN'T HOLD UP. reversing on evidence.
first run returned 0 posts on almost every day INCLUDING 2026-08-23 — the day CATE traded $52.8M.
that is not silence, that is a broken query. false zeros are worse than no data: they'd teach the
baseline that nobody ever discusses these tokens, making any live reading look like a huge spike.

## DIAGNOSIS (empirical, 5 probe queries)
- `until:` IS applied but bleeds ~+1 day. `since:` alone does NOT constrain the top of the range.
- queryType=Latest returns newest-matching regardless of window. **queryType=Top actually spans the period.**
- ! MY BUG: `to` was already end-of-day, then I added another 864e5 > query reached D+2 > client filter discarded everything.
- pagination exists (has_next_page + next_cursor), 20/page. never used it.

## ! WHY IT'S ABANDONED ANYWAY — the killer is not cost
corrected query + 3 pages for 2026-08-23: 57 posts fetched, spanning 08-23 04:37 > 08-25 03:43, only **9 actually on 08-23**. 16% yield.
- cost: tolerable (~$1.30 for 14d x 2 tokens). NOT the blocker.
- !! blocker: a SAMPLE cannot yield a CENSUS. breadthIndex needs the true count of distinct authors in a window.
  fetching 57 and keeping 9 tells us how many we sampled, not how many posted. and that count scales with how many pages we PAID for.
  ∴ the baseline would measure our own spending, not the market. unusable by construction, at any price.
- engagement was already known-inflated (likes accrue post-hoc). two independent reasons to drop it.
- ✓ purged all 28 backfilled rows. did not leave them "just in case" — poisoned rows get used eventually.

## KEPT FROM THE WORK
- breadthIndex() — unique authors, log1p, z vs own history. still the better index than engagement, just live-only now.
- hypeIndex baseline excludes src!=='live' rows. defensive, still correct.
- searchWindow() + backfill.js retained but NOT called. if a proper historical endpoint appears, the scaffolding is there.

## LIVE COLLECTOR RUNNING
- main/collector.js standalone, nohup, independent of the app window. 40min cadence, CA every cycle + cashtag every 3rd.
- ! cadence set BY BUDGET not preference: ~$8.60/mo of the $12 cap. faster polling exhausts the month and stops collecting entirely — worse than coarser buckets.
- reads watchlist from snapshot.json ∴ adding a token in the UI starts collecting it.
- persists spend to x-spend.json across restarts.
- cycle 1: CATE 20 posts/16 people sent +0.418 | NEEGY 20/19 sent +0.735 | both 'moderate' confidence. spend $0.006.
- breadth index shows '—' until 10 live readings ≈ 6.7h. correct behaviour, not a fault.

## STATE
- ! social NOT wired into UI (operator: "wait on the wiring"). engine + collector run headless.
- operator asked for a break. stopping here.
