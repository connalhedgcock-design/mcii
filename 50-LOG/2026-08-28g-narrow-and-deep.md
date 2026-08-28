---
id: log.20260828g
t: log
v: 1
prio: high
---
# 2026-08-28 MEASURED THE X FEED, THEN NARROWED THE SEARCHES

## WHAT I MEASURED (live, ~$0.16 total)
- one request returns **20 posts**, whatever you ask for. asking for 200 returned 20. it is a page.
  ∴ depth requires following `next_cursor`. built: searchPosts now paginates, w/ `truncated` flag (D-31 closed).
- `solana memecoin` alone: 300 posts walked over 15 pages = **351 posts/hour** for ONE phrase.
- ∴ whole feed ≈ half a million posts/month. budget at $0.00015 buys **80,000**.
  **wide coverage was never possible.** we were paying for a random ~10% slice of a narrow slice.
- ! and the slice was junk: 57-post sample = **68% set aside as advertising**.
  verbatim: "5x up from my call", "162x profit from entry", "$FRIES JUST HIT 17X", "Dm for entry".
  0 posts about CATE or NEEGY.

## THE DECIDING NUMBERS
| search | volume | cost to capture EVERY ONE |
|---|---|---|
| coins dying (rug/pulled liq/can't sell) | ~44/hour | **$4.71/mo** |
| market mood ("dried up","everyone left") | ~0/hour | $0.02/mo |
| the firehose (`solana memecoin`) | ~351/hour | $37/mo — unaffordable AND mostly adverts |

## ✓ DECIDED — narrow and deep. operator agreed after seeing the numbers.
- dropped `solana memecoin` + `pump.fun` outright.
- dying: 50 posts/hour, paginated. **complete coverage of the thing that changes behaviour.**
- mood: 20 posts every 6h. cheap, occasionally says something.
- their coins: 15 posts each, hourly, by ADDRESS (D-73).
- total **$9.00 of $12**, pinned by test.
- ! the principle: **completeness on a narrow thing beats a sample of a wide one.**
  a sample of rug reports tells you nothing. all of them is a base rate.
- per-query cadence stamps live in data/query-runs.json ∵ the job is a fresh process each hour AND
  the schedule is unreliable — "every 6 hours" must mean wall clock, not 6 firings.

## ! OPEN
- operator first said "go wide and deep, we can talk about more money", then agreed with the narrow
  read when shown the volume. **the reopen trigger is his, not mine**: if he wants the firehose back
  it costs ~$37/mo for coverage that is 68% advertising. I would argue against it once and then build it.
- hourly re-pulls overlap, so some posts are paid for twice. bounded (~15% waste at 50/hr vs 44/hr rate).
  a since-id cursor would remove it. not built.
