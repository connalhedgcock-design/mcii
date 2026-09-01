---
id: whisper.analysis-algorithm
t: whisper-topic
v: 1
upd: 2026-09-01
machine: connal
---
# ANALYSIS ALGORITHM — the thinking, gathered

!! THIS IS THE RAW THREAD, NOT THE BUILD RECORD. What gets DECIDED or BUILT lives in
[[70-AREAS/trading-strategy/README]]. What is still being thought through lives here. ! do not let
the same fact end up in both — a reader who finds two homes for one idea trusts neither.

## WHAT "THE ANALYSIS ALGORITHM" ACTUALLY MEANS
Everything that turns raw collected data into a read: what the social sweep pulls out of each
tweet, how coins get discovered, how attention is measured, whale/wallet movement, and how those
combine into a judgement about a coin. It sits UPSTREAM of the trading strategy — the strategy
decides what to do with a read; this decides how the read is produced.
! squarely Connal's lane per D-89 ("writing any algorithms needed to analyze the data we collect").

## THE WHISPERS IN THIS THREAD
- [[INBOX-connal|w-001]] — "cant get out" is not a useful measure for us; neither operator trades enough
  for illiquidity to trap them. → killed a metric I had proposed. see CONSEQUENCES below.
- [[INBOX-connal|w-002]] — make the "≥3 different people discussing an unknown ticker" mechanism more
  effective. → this is the discovery core.
- [[INBOX-connal|w-003]] — a notification must carry ANALYSIS (social + market) on whether something is an
  interesting buy/sell, not just a number. → locked as D-96.
- [[INBOX-connal|w-004]] — wallet / whale tracking is wanted and not built.
- [[INBOX-connal|w-005]] — liquidity draining is the present tense; social going quiet is a guess about
  the future. → the ordering principle for the whole thread, see below.

## THE SHAPE THAT IS EMERGING  `est:` conf 70%
w-005 is not just an observation, it is a **rule for ranking every signal this algorithm uses**:
prefer the thing itself over a hint about the thing. Applied consistently it sorts the work —
- **present tense, trust it**: pool liquidity, price, holder counts, wallet movements. these ARE
  the event. seconds old, hard to fake cheaply.
- **leading but soft, verify it**: social attention, distinct-people counts, coordination patterns.
  these can precede a move, which is their whole value, and can equally precede nothing.
- ∴ ! social earns its keep on the way UP (attention can exist before price moves). on the way DOWN
  the market data is faster and harder to fool, so social should never be the primary death signal.
- ∴ w-001 follows from the same rule: "can you exit" was a hint about a risk that does not exist at
  their size. the real question at $10–15 a position is whether the money is evaporating, not
  whether it is reachable.

## WHAT THE RESEARCH SAYS ABOUT THIS  → [[60-KB/social-signal-research]]
Researched 2026-09-01 against real papers, not from memory. The load-bearing findings:
- ! detecting manufactured promotion is well-supported; predicting price from mood is NOT — that
  literature shows 12–15pp train/test gaps, systemic overfitting, and explicit concept drift.
- ∴ per-tweet extraction aims at "real interest or a campaign", never at "what will price do".
- the strongest unused signal available to us is **time-synchronised posting across accounts**;
  co-posting inside narrow windows is treated as implausible without coordination.
- Connal's own addition, and it is right and also in the literature: **shared distinctive wording**
  across accounts, combined with timing. ! must key on UNUSUAL phrasing — crypto twitter shares a
  vocabulary, so "just aped" is meaningless and an identical rare 8-word sentence is not.
- ! pump-and-dumps concentrate under ~$50M market cap — that is this project's entire range, so
  this is a finding about THEIR market, not a distant one.

## CONSEQUENCES ALREADY TAKEN
- ✓ social sweep widened 2 → 6 queries for discovery (reopened D-81 by its own trigger). shipped.
- ✓ MAX_LOOKUPS 8 → 12 so the wider sweep is not throttled at the resolver.
- X "can you still exit" as an alert trigger — REJECTED by w-001 before it was built. keeping the
  receipt: it was my proposal, and it measured a risk their position sizes do not carry.

## NOT BUILT YET — the actual next piece
Per-tweet extraction. Every tweet already arrives with far more than we use (see
`twitterapi.js: normalize()` — currently only text, authorId and engagementRate are consumed):
1. every contract address in the text → exact coin identity, no ticker collision (D-73)
2. every ticker + distinct-author counts
3. author credibility (account age, postsPerDay, `declaredAutomated`, defaultAvatar, follower ratio)
   → turns "3 different people" into "3 different PLAUSIBLE people"
4. posting-time clustering per coin → the coordination signal
5. shared-distinctive-wording clustering per coin → w-002 + Connal's refinement
6. `source` (posting client) → automation tell, captured and unused

## OPEN `?`
- `?` does rising attention actually precede price moves for coins this small? ! UNKNOWN, and the
  research does not answer it for solana microcaps at minute-to-hour horizons. ∴ measure it and log
  a real forecast each time it fires; do not build on the assumption. [[50-LOG]] has the machinery.
- `?` a drop in mentions may mean interest died OR that our capped sample missed it. same shape as
  D-29 (failure is never a zero) and D-63 (a rate must say what its denominator excludes).
- `?` w-004 whale tracking: reading wallets works from a laptop but NOT from the cloud worker —
  every free Solana endpoint refuses `getTokenAccountsByOwner` from a datacenter (D-93). ∴ "track
  whales while the laptops are shut" needs a paid provider; in-app whale tracking does not.
