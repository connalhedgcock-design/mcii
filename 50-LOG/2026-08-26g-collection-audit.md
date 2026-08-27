---
id: log.20260826g
t: log
v: 1
---
# 2026-08-26 COLLECTION AUDIT — 3 bugs found in the first 14 hours of live running
! all three share one shape: the collector produced a number that LOOKED like a reading and wasn't.
! none would have thrown an error. none would have been found by reading the code. only by auditing output.

## BUG 1 — FAILED FETCH RECORDED AS ZERO  (severity: would have corrupted every score)
- cycles 11-13: `fetch failed` > collector still wrote a bucket of 0 posts / 0 people as if it had looked and found silence.
- ∴ baseline learns "nobody discusses this token" > every successful reading later reads as a spike.
- ! this is the SAME false-zero failure that killed the backfill (D-27), reappearing live. I fixed it there and shipped it here.
- ✓ no successful query > NO ROW. `anySucceeded` guard.
- ✓ purged all zero-post rows: CATE 13>6, NEEGY 13>7. ~half the corpus was fake.
  ! discarded genuine quiet readings too — indistinguishable after the fact. losing a real zero is far cheaper than keeping a fake one.
- root cause of the failures themselves: laptop sleep. cycle 11 took 46min wall-clock. curl 3/3 200 when awake. NOT an API fault.
- ✓ http.js now names it ('no network connection' / 'timed out after Nms') instead of raw "fetch failed".
- ✓ collector retries on 2/4/8/16m backoff after a dead cycle instead of losing a full 40min slot.

## BUG 2 — DUPLICATE READINGS COUNTED AS INDEPENDENT  (severity: baseline measures nothing)
- NEEGY sentiment IDENTICAL to 3dp across 6 readings spanning 10h: +0.735 x4, +0.818 x3.
- ∴ we were re-fetching the SAME 20 posts each cycle. token too quiet for the latest-20 to turn over.
- ∴ 7 rows = 1 observation counted 7 times. any z-score off that is measuring our poll rate, not the market.
- ✓ persistent seen-id set per token (bounded 4000). bucket now measures NEW posts.
- ✓ snapshotPosts/snapshotAuthors kept alongside ∵ "20 exist, 0 new" is a real and DIFFERENT statement from "20 new arrived".

## BUG 3 — SILENT TRUNCATION  (severity: undercount on exactly the tokens that matter)
- page cap is 20. CATE hit it constantly ∴ active tokens were undersampled while quiet ones were double-counted. worst of both.
- ✓ `truncated` flag on every bucket. a full page means the reading is a FLOOR, not a count. anything consuming it must know.
- ? pagination still not implemented. next fix. cost-bounded — see D-28.

## STATE AFTER CLEANUP
- CATE 7 good readings (14-32 people, sentiment +0.14..+0.42, avg +0.30)
- NEEGY 8 good readings but ~6 are duplicates of 2 ∴ effectively 2. breadth score is further away than the row count suggests.
- spend $0.0627 / $12. 418 posts. cost is a non-issue; DATA QUALITY is the constraint.

## ! METHOD NOTE — keep this
running it for 14h found 3 bugs that 53 passing tests did not. the tests verify the LOGIC; only live output
reveals that the INPUTS are wrong. audit collector output on a schedule, don't assume silence means health.
