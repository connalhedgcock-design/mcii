---
id: whisper.analysis-algorithm
t: whisper-topic
v: 3
upd: 2026-09-07
whispers: 5
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
- [[INBOX-connal|w-005]] — liquidity draining is the present tense; social going quiet is a guess about
  the future. → the ordering principle for the whole thread, see below.
- [[INBOX-connal|w-007]] — one algorithm must not decide both the direction AND how sure we are;
  those are two stages. Count every version of a rule we try. And the app's live numbers and the
  saved record can be half an hour apart, which would fake an edge. → researched in full,
  [[60-KB/signal-architecture-research]].
- *(id pending)* — inferring how REAL-WORLD EVENTS move crypto (a rocket launch → DOGE), and
  whether the system can tell when someone with massive pull (Elon) or a large trader/whale posts,
  and how those posts are analysed. ! two distinct asks in one whisper: event→market inference, and
  author-influence weighting. The second is far more tractable than the first with what we already
  collect (`twitterapi.js: normalize()` already returns follower counts, verification, account age).

## OWNED BY OTHER THREADS, RELEVANT HERE
! one whisper, one owning folder — these are referenced, not held, so the same thought never has
two homes.
- [[../alerts/README|w-003]] — a notification carries the analysis, not just a number (D-96). This
  thread PRODUCES that analysis; the alerts thread decides how it travels.
- [[../whale-tracking/README|w-004]] — wallet/whale tracking. Would be a new INPUT to this thread,
  not part of it.

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

## WHAT THE ARCHITECTURE RESEARCH SAYS  → [[60-KB/signal-architecture-research]]
Researched 2026-09-01 (w-007). Structure findings, separate from the per-tweet findings above:
- ! **direction and confidence are two stages, not two outputs of one model** (meta-labeling). The
  first stage may be trigger-happy; the second scores how often the first is right, and that score
  is the size. ∴ "confidence determined by Claude" becomes a falsifiable output with its own record
  instead of an assertion — which is the exact worry logged in [[70-AREAS/trading-strategy/README]].
- ! **gates before scores.** Non-compensatory rules (one question at a time, no trading-off)
  generalise BETTER than weighted models in small, noisy samples. ∴ the RUG GATE's shape is correct
  and should not be "upgraded" into a weighted risk score later.
- ! **equal weights, not fitted ones.** At this sample size any learned blend is noise.
- X Dempster-Shafer evidence theory REJECTED as the fusion layer — it misbehaves exactly when
  sources conflict most, and it exists to collapse conflict into one number, which D-50 forbids.
- ! **count the trials.** The more rule variants we evaluate and discard, the better the survivor
  must look to mean anything. The count must be kept from the first variant; it cannot be
  reconstructed later.
- !! **unfixed hazard**: the live app state and `data/*.jsonl` can disagree by up to the cron
  interval. Designing a rule against one and scoring it against the other manufactures a fake edge.
  Pick one surface before building the picker. THIS IS THE OPEN QUESTION BLOCKING THE NEXT BUILD.
## MY READ ON THE 09-01 WHISPER — influence weighting vs event inference
Connal asked for thoughts. Both halves assessed separately ∵ they are not equally tractable.

### HALF A — "can we tell when someone with massive pull, or a whale, posts"  ✓ BUILDABLE
- fact: `twitterapi.js: normalize()` already returns followers, following, verified, createdAt,
  postsPerDay, defaultAvatar, fastFollowers on every post. ∴ weighting a mention by who said it
  needs NO new data and NO new spend. It is arithmetic on fields already stored and discarded.
- ! but follower count is REACH, not market impact. A 40M-follower general-interest account may do
  nothing to a $2M solana coin while a 9k-follower account read by the 300 people who actually
  trade it moves it. ∴ the honest version measures influence EMPIRICALLY: which authors, when they
  post about a coin, are followed by a measurable change in that coin's own numbers. That is
  learnable from their own record and falsifiable. Use follower count as a placeholder ONLY, and
  say on screen that it is a placeholder.
- !! COLLECTION GAP, and it is the real blocker: MCII does not watch ACCOUNTS, it watches SEARCHES
  (D-67/D-81 — one broad sweep, narrow-and-deep on coins dying). A post by Elon reaches us only if
  it happens to match a sweep query. "Tell me when this specific person posts" is a different query
  shape with its own cost, and it competes for the same $24 cap (D-64/D-68 — the pot is divided,
  not extended). ∴ this is a BUDGET decision, not just a feature.
- !! I GOT THIS WRONG ON 09-01 AND CONNAL CAUGHT IT. What I wrote first: "on a twice-hourly sweep
  we cannot be early to a mega-account post — machines read the firehose in milliseconds." The
  milliseconds part is a real fact about BOTS REACTING and I used it to answer a different question:
  HOW LONG THE MOVE LASTS. Those are not the same thing, and I had no measurement for the second.
  Connal pushed back and asked for the numbers instead of the assertion. He was right.
  ! keeping the wrong claim visible per the vault's never-delete-a-rejected-idea rule. ! the general
  failure to watch for: quoting a true fact about a NEARBY question as if it settled the one asked.
- fact @event-study literature on Musk/DOGE (blockchainresearchlab; Ante, ScienceDirect; Kent):
  measured windows are MINUTES TO AN HOUR, not milliseconds. Reported: ~1.23% abnormal return in
  the minute of the post; ~4.43% cumulative by 30 minutes; **no longer statistically significant
  after ~55 minutes**. The "One word: Doge" post: ~8.17% over five minutes, peaking ~17.31% at one
  hour. Abnormal volume and price for at least 60 minutes after a tweet.
- ∴ the window is real and is roughly HALF AN HOUR TO AN HOUR wide. That is not a machine-speed
  race. It is slow enough that a human with a phone is inside it — which is the opposite of what I
  said.
- !! BUT THE CADENCE PROBLEM IS NOW THE WHOLE PROBLEM, and it is sharper than before: our scan runs
  twice hourly (D-90, `:12,:42`). A ~30-minute window sampled every ~30 minutes means we arrive at
  a uniformly random point inside it — sometimes near the start, often near the end, sometimes after
  it has closed. ∴ if this game is worth playing, cadence for THIS signal is the thing that decides
  it, not the analysis.
- ! CAVEATS BEFORE ANYONE TREATS THOSE NUMBERS AS OURS: that is DOGE — large, liquid, on
  centralised exchanges, mostly 2021 data. Ours is solana microcaps in 2026. Same caution as
  [[60-KB/social-signal-research]]'s Tier-2 note: evidence the effect EXISTS, not a number we own.
- !! SELECTION BIAS, and it is the one that would fool us: those studies examine the tweets that
  MOVED things. The denominator is every post that person made, and most did nothing. Same shape as
  D-63. ∴ our own test must measure EVERY post from a watched account, not the memorable ones. ✓ what we CAN
  do REGARDLESS of whether the entry window is playable is answer whether a move was driven by ONE loud
  account or by MANY independent people — which is exactly the distinct-people + author-diversity
  machinery already in `hype.js`. One-account moves and broad-base moves are different animals.
  ! consistent with D-36 (aimed at exit speed, never at being first).
- ! this input is the single most impersonable one we would have. Impersonation accounts using a
  famous name and avatar are routine. ∴ author identity must key on the account id, never the
  display name, and a high-influence claim must show the handle for eyeballing.
- `est:` conf 75% that a measured-impact author weight beats the current unweighted distinct-people
  count. ! falsifier: after n>=50 posts from top-weighted authors, if the coin's subsequent moves
  are indistinguishable from moves after ordinary posts, the weighting is decoration — delete it.
### THE MEASUREMENT CONNAL ASKED FOR — and why it cannot wait until "when we are done"
Connal, verbatim: "i want you to run the numbers when we are done with this project and see how
long the actual window to get in on the inital pump after a social media boost from a famous person
is and then we can decide together whether that is a game we want to play."
✓ agreed, and it is the right instinct — this is a measurable question and I answered it with an
opinion. But it CANNOT be run retrospectively later on data we are not keeping:
- !! we do not accumulate fine-grained price history. Chart data (`fetchHistory`) is fetched ONLY
  by the live desktop app while it is open; the cloud collector never calls it. And the cloud scan
  is twice hourly. ∴ **a twice-hourly price record cannot resolve a 30-minute window.** Waiting
  until the end of the project guarantees the answer is unavailable when we ask for it.
- ∴ ! to answer this later we must START RECORDING NOW: for a small set of watched high-pull
  accounts, the post timestamp, and minute-level price for the coin it names for ~2 hours after.
  That is a narrow, cheap capture — it is not a new scanner, it is a trigger plus a short recording.
what the study would then report, defined in advance so it cannot be moved afterwards:
1. how much of the total move is still available 1 / 5 / 15 / 30 / 60 minutes after the post
2. what fraction of posts from those accounts move anything at all (the denominator — D-63)
3. how much of the remaining move survives fees + slippage at their real position size
   ! [[60-KB/base-rates]]: an edge under ~2-3% round trip is not an edge.
4. how often our own twice-hourly clock would have SEEN it while the window was still open
! `est:` conf 60% that a playable window exists for solana microcaps at all — the DOGE numbers are
a different asset class and I am not transferring them. That is a real prediction, not a hedge, and
it should be logged in [[50-LOG]] and scored against the result.


### HALF B — "infer how real-world events affect crypto (rocket launch -> DOGE)"  X NOT AS PREDICTION
- ! the DOGE/launch link is NARRATIVE, not mechanical. DOGE has no claim on SpaceX cashflows; the
  link exists only while people believe it does. ∴ it is precisely the regime that
  [[60-KB/social-signal-research]] documents breaking without warning (explicit concept drift —
  "a strategy that worked in 2017 may fail by 2025").
- ! sample size kills it before anything else does. A repeatable event type produces a handful of
  historical instances, and [[60-KB/signal-architecture-research]]'s trials finding applies with
  full force: search enough event types against enough coins and a striking pattern appears by
  construction. This is the highest-risk idea in the whisper file for exactly that reason.
- ! timing kills what sample size leaves. SCHEDULED events (launch dates, listings, unlocks, Fed
  dates) are public in advance ∴ priced in advance. UNSCHEDULED ones are reacted to by machines in
  under a second. Neither leaves room for a laptop on a 30-minute clock.
- ! and it is the purest form of the anti-pattern the mandate already bans — narrative-fitting,
  "explaining a price move after the fact", where price moves without cause are the base case.
- ✓ THE VERSION THAT IS REAL AND WORTH BUILDING: not "what will this event do", but **"is there a
  known reason for what just happened"**. A move WITH a public catalyst and a move with no visible
  cause are different readings, and the second is more often distribution. That is a context field
  on an alert (D-96 already says alerts carry the evidence), not a predictor.
- ✓ ALSO REAL, and cheap: a plain CALENDAR of scheduled dates for coins they hold — unlocks,
  listings, migrations. Useful, checkable, no inference required. Not the same idea, but it is the
  half of the idea that pays.
- ! falsifier for my own position, and I will act on it: if Connal (or anyone) can name a single
  event type with 20+ historical instances and a consistent direction AND size across them, it is
  testable and I should test it rather than argue. Fewer than that is a story, not a sample.

### ∴ RECOMMENDATION, stated once
Fold author-influence weighting into the per-tweet extraction work that is already this thread's
named next piece (items 3 and 4 in NOT BUILT YET, below). Do NOT build event->price inference.
Keep its useful residue as alert context and a dates calendar.
! open, needs Connal: watching named ACCOUNTS costs sweep budget that currently buys coin coverage.
That trade is his call, not mine.

## AUDIT OF WHAT WE ACTUALLY COLLECT, 2026-09-01 → [[50-LOG/2026-09-01-social-collection-audit]]
Measured, not assumed. The four findings in one line each:
1. 99% of social readings sit below our own U>=25 reliability bar (median 13 unique authors).
2. the current burn rate exhausts the $24 month around day 11-16, and hitting the cap stops
   collection dead (D-28/D-42). ! 2h47m sample — act on the sign, not the figure.
3. the broad sweep now supplies 1.1% of posts; ~99% comes from per-coin top-ups, which is the exact
   cost shape D-67 exists to prevent.
4. !! we store CONCLUSIONS, not evidence — no author id, age, postsPerDay, automated flag, client
   or per-post addresses are kept. ∴ every item in NOT BUILT YET below can only ever run on data
   collected AFTER it is built, and the 5 days already banked are unrecomputable. This is the one
   finding where delay costs something permanent.


## CONSEQUENCES ALREADY TAKEN
- ✓ social sweep widened 2 → 6 queries for discovery (reopened D-81 by its own trigger). shipped.
- ✓ MAX_LOOKUPS 8 → 12 so the wider sweep is not throttled at the resolver.
- ✓ 09-07, from the docx read above: `data/notable-accounts.json` grown from 2 → 5. Added
  @MustStopMurad, @blknoiz06 (Ansem), @Pumpfun — Connal's pick from the doc's candidate list,
  chosen specifically for lowest added cost (each handle is ~$3.24/mo at 30-min cadence, measured
  from `data/x-spend.json`: 2 handles already ~$6/mo of the $24 X cap). ! the other 9 candidates
  (moonshot, notthreadguy, frankdegods, JupiterExchange, phantom, lookonchain, whale_alert,
  CoinbaseAssets, binance) were NOT added — Connal chose cost over coverage this round. They stay
  logged above as a bench if the cap ever grows or a cheaper cadence is found.
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

## !! THE PUMP-DURATION CAPTURE IS BUILT AND LIVE, 2026-09-05 — `app/main/pumpcapture.js`
The measurement itself ("how long is the window after a big post") still needs real data to
accumulate before it can be answered — that has not changed. What changed: the RECORDER now runs.
Every real FOMO buy signal (tracked coin or not — gating this on admission would silently exclude
most of the denominator, D-63) starts a 2-hour, ~90-second-interval price capture, tagged with the
trigger that started it. Tested live against real CATE data before trusting it. Writes to
`data/pump-captures.jsonl`, local to whichever Mac the trigger fires on (same laptop-dependency as
`fomonotifications.js` itself — stated, not glossed over).
- The four things the eventual study reports were fixed BEFORE any data exists, per this file's own
  discipline: (1) how much of the move survives at 1/5/15/30/60 min, (2) what fraction of triggers
  move price at all, (3) how much survives fees+slippage at a real position size, (4) whether the
  twice-hourly cloud scan would have caught it while the window was open.
- ! Elon/Trump triggers would use this SAME recorder once T-032 unblocks — nothing here changes,
  only the trigger source does.
- ! n=0 until real FOMO buy signals actually fire while this is running. Same "walk-forward has no
  lookahead, the record starts from here" shape as everything else built this week.

## MY READ ON THE EXTERNAL X-ALGORITHM DOC (docx, sent 09-07, source: another AI, unvetted)
Connal forwarded a doc — another AI's answer to "how would you redesign the X tracker for
memecoins." Compared against D-122/D-123, which shipped THE SAME DAY. ! its own anecdotes (an AURA/
Binance move, a 2026 $ANSEM example) are unsourced in the doc — treat as illustrative, not `fact:`.

**AGREES WITH WORK ALREADY DONE, no action needed:**
- its "don't wait for the literal ticker" push is the coordination/wording-fingerprint machinery
  `postfacts.js` already runs, and matches this thread's own "strongest unused signal" finding
  (time-synced posting across accounts, [[60-KB/social-signal-research]]).
- its social→narrative→onchain-confirm→trade funnel IS D-117 (wallet + social + market, three
  inputs, none alone triggers a trade). Already the shape.
- wanting more names on `data/notable-accounts.json` is exactly D-123's own open item — Connal
  said he wanted more than Elon/Trump but didn't have names yet.

**NEW, buildable, worth doing:**
- ! cross-account timing correlation SPECIFICALLY for the notable/traction tracks — did several
  watched/high-traction accounts touch the same coin inside a tight window, not just one loud
  post. `data/notable-posts.jsonl` already timestamps every event on both tracks, so this is
  arithmetic on data already paid for, not a new purchase. Same shape as the bulk-track
  coordination check, just applied to the small curated list.
- a candidate account list, specific enough to be a real decision rather than a guess:
  @MustStopMurad, @blknoiz06, @Pumpfun, @moonshot, @notthreadguy, @frankdegods,
  @JupiterExchange, @phantom (memecoin-culture reach); @lookonchain, @whale_alert,
  @CoinbaseAssets, @binance (confirmation-tier, not primary catalysts). ! stays Connal's editorial
  call per `notable-accounts.js`'s own design — I present candidates, I do not add them.
- ! cost is not free: each handle added is one more paid search every collection cycle
  (twice-hourly). Adding all 12 at once should be checked against the $30 cap first, same
  caution D-65 set for coins.

**CONTRADICTS A DECISION MADE THE SAME DAY, do NOT build:**
- ! its `AttentionScore = Σ(weight × strength × relevance × novelty × recency)` and its
  40/25/15/10/5/5 category split are both an averaged, weighted, blended score — exactly what
  D-122 killed hours earlier (averaging social into a coin's score never showed it predicted
  anything) and what [[60-KB/signal-architecture-research]] separately found fails at this sample
  size (fitted/weighted blends are noise; non-compensatory gates generalise better; a
  Dempster-Shafer-style collapse into one number was rejected for the same reason). Same mistake,
  different vocabulary.
- its "let the algorithm learn who matters from 100–300 accounts + return correlation" is
  directionally RIGHT — it's the same empirical-weighting conclusion this thread already reached
  (HALF A above, `est:` conf 75%) — but it is a far bigger build than it reads as: full post
  history plus minute-level price for every one of 100–300 accounts, and the 09-01 audit found we
  do not keep that resolution even for the 2 accounts already watched. Not wrong, just not paid
  for yet. Log as a future direction, do not start it now.

∴ what I'd actually do with this doc: bring Connal the account list as a decision, build the
cross-account timing check (free, reuses existing data), and leave the scoring-formula half on
the floor where D-122/D-123 already put it.

## OPEN `?`
- `?` does rising attention actually precede price moves for coins this small? ! UNKNOWN, and the
  research does not answer it for solana microcaps at minute-to-hour horizons. ∴ measure it and log
  a real forecast each time it fires; do not build on the assumption. [[50-LOG]] has the machinery.
- `?` a drop in mentions may mean interest died OR that our capped sample missed it. same shape as
  D-29 (failure is never a zero) and D-63 (a rate must say what its denominator excludes).
- `?` w-004 whale tracking: reading wallets works from a laptop but NOT from the cloud worker —
  every free Solana endpoint refuses `getTokenAccountsByOwner` from a datacenter (D-93). ∴ "track
  whales while the laptops are shut" needs a paid provider; in-app whale tracking does not.
