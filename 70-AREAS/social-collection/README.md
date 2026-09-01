---
id: area.social-collection.readme
t: area-readme
v: 1
upd: 2026-09-01
machine: connal
---
# SOCIAL COLLECTION — what we buy from X, and what we do with it

!! Rebuilt 2026-09-01 against MEASURED OUTPUT, not intuition. If you are about to change the
queries or the filter, read the numbers below first — the last redesign happened because the
system was doing something nobody had checked.

## THE TWO TRACKS  (Connal's design, 2026-09-01)
He asked for a hybrid: heavily filtered high-quality signals AND a wider unfiltered pile for
finding patterns later. ! The important refinement is that these are NOT two collections.
**You pay per post FETCHED; filtering afterwards is free.** So it is one wider purchase with two
treatments — which is cheaper than two pipelines and means the two tracks are automatically about
the same posts, so they can be cross-referenced later.

- **STRICT** — `kind: 'emerging'` in `shared/importance.js`. A post counts only if it names a coin
  with real confidence, comes from an account that looks like a person, and is not an advert.
- **BULK** — `shared/postfacts.js` writes one row per post PAID FOR, whatever the filter decided.
  Facts only: which coins named, account credibility, timing, reaction, wording fingerprint.
  ! no text, no handles, no author ids — D-22 stands. Author id is a per-install salted hash.

## WHAT WAS ACTUALLY WRONG  (measured over 5,865 swept posts, 08-27..09-01)
| | before | after (first live run, 175 posts) |
|---|---|---|
| coins dying | 64% | 8% |
| noise | 27% | 59% |
| a person naming a coin | — did not exist — | **23%** |
| posts kept as data | ~85% (874 dropped) | 100% |

! **ROOT CAUSE WAS THE CLASSIFIER'S ORDERING, NOT THE QUERIES.** The if-chain could only rate a
post highly if it was about a coin already held or a coin failing. A real person naming an unknown
coin fell through every branch onto `noise`. The filter was not badly tuned — it was pointed the
wrong way, and no amount of query tuning would have fixed it. ∴ before blaming inputs, check
whether the thing consuming them can even represent the answer you want.

## THE RULES THAT MAKE `emerging` HARD TO FAKE
All three required, because each alone is trivially faked — a botnet can name a coin, a human can
shill, an advert can be well written. Together they are expensive at scale.
1. names a coin at `strong` confidence or better (cashtag or address)
2. the account passes `shared/credibility.js` and is not bot-flagged
3. no promotional language (D-23: sales talk is a manipulation marker, never enthusiasm)

! **A CASHTAG QUALIFIES WITHOUT A RESOLVED ADDRESS.** An unknown coin has no address yet — that is
what makes it unknown. The first version required one and scored "$BUDDY has been quietly
building" as noise, which is the exact post the branch exists to catch. Bare words that merely
spell a ticker still do not qualify (D-72 — their scan record contains a coin called "fone").

## CREDIBILITY REPLACES HEAD-COUNTING
`shared/credibility.js` scores an account 0..1 from account age, posting rate, follower shape,
default avatar, bought-follower share, and X's own automation label. Grounded in the bot-detection
literature (`60-KB/social-signal-research.md`), which is the part of this field that replicates.
! deliberately NOT content-based — scoring what an account SAYS collapses into "posts I agree with".

- Three week-old accounts posting 400×/day now weigh **0.0**, not 3.0.
- `unknownTickers` gates on the WEIGHTED figure, so "3 people" means three plausible people.
- ! raw and weighted are BOTH reported. The GAP is the signal: twelve accounts weighing 1.4 is a
  campaign, and one number would hide that.
- First live run: **40 of 175 accounts scored as throwaways.**

## COORDINATION — Connal's own addition, and it is in the literature
Same *distinctive* wording from *different* accounts inside a tight window. Both halves required:
timing alone catches a busy hour, wording alone catches a popular phrase.
- wording is a fingerprint of normalised text — tickers, numbers and URLs stripped — so one
  template reused across coins collapses to one print. That is what a campaign looks like.
- ! posts under 8 words are never fingerprinted. "gm" is not a conspiracy.
- ! **rings feed BACK into discovery.** Without that, a coordinated push produces the STRONGEST
  possible signal: each sockpuppet passes the per-post check individually, so three of them yield
  three `emerging` posts and a discovery hit. The per-post filter cannot see across posts by
  construction; only the cross-post check can, so what it finds must reach the thing it contradicts.
  A flagged coin is MARKED, never deleted (D-69).

## BUDGET
Ceiling $18.16/mo of the $24 cap. September running at ~2%. `dying` cut 50 → 20/hr: it was two
thirds of all spend, buying expensive coverage of a base rate already established
(`60-KB/base-rates.md`: ~97% of memecoins die). ! this was a REALLOCATION, not an economy.

## ! WHAT IS NOT PROVEN — read before trusting any of this
- `?` **nobody has shown `emerging` predicts anything.** All that is demonstrated is that the
  system now NOTICES these posts. Whether a coin three credible people mention goes anywhere is
  unmeasured, and `60-KB/social-signal-research.md` says the sentiment→price literature is weak
  (12–15pp train/test gaps, explicit concept drift). ∴ log forecasts and check them. Do not build
  position sizing on this until the record exists.
- `?` the manipulation detector fired on only 3 of 376 per-coin readings before this change, and
  bot share read 0% most of the time. For memecoin X that is hard to believe. ! a detector that
  never fires looks identical to one that is not running — this needs testing against a coin known
  to be pumped.
- `?` the sweep still barely covers the watchlist: 1 of 175 posts. The "one sweep, sorted
  afterwards" design (D-67) was meant to stop cost scaling per coin, and in practice 99% of
  per-coin posts still come from dedicated top-up searches. ! cost IS scaling with the watchlist.

## FILES
- `shared/importance.js` — the filter. `classify()` decides what a post is; `rank()` splits a sweep.
- `shared/credibility.js` — account → 0..1 weight.
- `shared/postfacts.js` — the bulk track + coordination detection.
- `shared/resolve.js` — ticker/address → coin, and `unknownTickers()` discovery.
- `main/adapters/twitterapi.js` — the six queries and their depths.
- `data/post-facts.jsonl` — the bulk record.
