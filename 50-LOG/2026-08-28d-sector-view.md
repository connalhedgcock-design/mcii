---
id: log.20260828d
t: log
v: 1
prio: high
---
# 2026-08-28 "WHAT'S HAPPENING" — SECTOR VIEW

## OPERATOR ASK
"a section that displays general news/tweets about memecoin stuff so we can see overall market trends...
can't just be for coins we specify, needs to scan for new coins and identify up/down ticks...
similar to j7 tracker but it needs to SYNTHESIZE all the info and display social media trends."

## ! MY CONCERN, STATED ONCE THEN BUILT ANYWAY (mandate: state it, log it, execute)
- a sector-wide chatter feed is the single feature in this app most likely to make them trade WORSE.
  G-01 scored "social predicts price" as half wrong on day one. a scrolling hype feed IS crypto-twitter.
- ∴ built the version that survives the objection: the screen answers **"what kind of market is this,
  how careful should I be"** and never **"what should I get into"**.
- ✓ operator asked for synthesis, not raw scroll — the second half of his message resolved this himself.
- D-20 (no J7Tracker integration) UNTOUCHED. "similar to j7" = our own thing, not their API. still no public API.

## DESIGN RULES BAKED IN (each is a test)
- tickers ranked by HOW MANY DIFFERENT PEOPLE said them. never mention count, never views, never price.
  20 posts from 3 accounts must not outrank 8 people saying it once. (D-25)
- coins listed NEWEST FIRST, explicitly "not ranked". the 24h column is there to read, not to sort by. (D-43)
- promotional language counted SEPARATELY from tone, both on screen. (D-23)
- caveats render inside the same card as the claims, never behind a toggle.
- pushRatio = posts-per-person >= 4. a headcount threshold missed a 3-account/20-post campaign in test.

## !! THE BUG I SHIPPED AND CAUGHT ON LIVE DATA BEFORE HE SAW IT
- first version computed a **"survival rate"**. live output: **"of 10 coins found a day ago, 10 can still
  be sold — 100%"**.
- ! that number is an artifact of its own denominator. candidates.jsonl stores ONLY survivors, and a coin
  that dies stops appearing in the trending feeds the scanner reads, so it LEAVES the record rather than
  being marked dead. I then excluded stale rows — deleting exactly the dead coins from the sample.
- ∴ the metric could only ever return a high number. it would have told them new coins are safe.
  the handoff's own figure says 38 of 60 rejected because you could not get out.
- ✓ replaced with cohort(): reports pool-money direction among coins still being seen, counts vanished
  ones as UNKNOWN not survived, and the survivorship bias is a permanent caveat printed every time.
- ✓ the funnel's rejection reasons now lead the synthesis ∵ they are the only figure counted over
  EVERYTHING looked at rather than over what survived.
- ! sixth instance of the project's recurring shape: **check what the denominator excludes.**
  same family as "an index that re-scans itself" and "errors that look like empty data".

## BUDGET — the real constraint, measured not guessed
- fact: $0.00015/post. per-coin social hourly, 2 coins = **$8.64/mo**. sector every 4h, 4 queries x 15 = **$1.62/mo**.
  total **$10.26 of $12**.
- ! a THIRD watchlist coin adds $4.32 and breaks the cap. the watchlist is not free and nothing says so yet. TODO.
- sector collection runs AFTER per-coin and stops if under a $2 reserve ∴ a reading on a coin they hold
  always wins over a sector mood.
- ! cadence is SELF-LIMITING (checks its own last row), not scheduled — ∵ the schedule fired 0/27 times today.

## SHIPPED
shared/sector.js (tickers, pushRatio, breadth, cohort, funnel, synthesize) | twitterapi.sectorQueries (4 terms)
| cloud-collect.collectSector > data/sector.jsonl | scans.jsonl now carries `rejects` | ipc sector:latest
| new tab "What's happening" | 27 tests. TOTAL 113 > 140.

## ! OPEN
- the conversation card stays empty until the cloud job runs — the X key only exists there. expected, and it says so.
- discovery still momentum-biased (unsolved, open item 2). this screen makes the bias VISIBLE rather than fixing it.
- a fixed cohort (re-checking rejected coins too) is the only way to get a real death rate. not built.
