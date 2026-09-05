---
id: area.trading-strategy.log
t: area-log
v: 2
upd: 2026-09-05
machine: connal
---
# TRADING STRATEGY — log (append-only)

## 2026-08-31 — 1. THE WHOLE CONVERSATION, IN ORDER
- machine: connal

**Started with a capability question.** Connal: "how well can you analyze memecoin graphs... could
you learn to analyze graphs, pull data from social media, and identify rug pulls efficently."
Answered honestly: reading exact numbers off a chart image isn't reliable, and chart-pattern
prediction has weak evidence even for professionals, more so for memecoins driven by narrative not
structure. What's actually reliable is reasoning over the STRUCTURED numbers MCII already computes
(liquidity, holders, safety), not eyeballing images. Social pulling already exists (the X sweep).
Rug detection splits in two: mechanical rugs (mint/freeze/LP-pull) are already caught reliably via
on-chain facts; "soft rugs" (a coin just loses interest) are a genuinely hard crowd-prediction
problem no amount of chart-reading skill fixes.

**Connal: "so with really solid data you could become a successful trader."** Pushed back directly:
better data fixes being wrong about facts, not the actual hard problem (predicting what other
people do next). Memecoin markets are adversarial — a reliable public signal gets arbitraged away.
The project's own forecast record is barely started, nowhere near enough to claim any edge exists
yet. The defensible, already-real value here is risk management (catching rugs, knowing real exit
liquidity), not picking winners — which is exactly why the mandate bans buy/sell/size language.

**Connal: "dont ever just staright up disagree with me try to help me flush out my idea."**
Recalibrated: engage constructively, find the buildable kernel, hold firm only on genuine
structural boundaries, state them plainly when they come up rather than softening past them.

**Reframed the "become a trader" idea into something real:** pick one specific, falsifiable
hypothesis (e.g. the existing "accumulating" signal), log it as a real forecast every time it
fires, let the Brier score answer honestly whether it beats a coin flip — instead of assuming an
edge exists. Separately: better data reliably cuts the worst losses (catching a rug before it
happens) even with zero ability to predict winners — a real, provable win available right now,
independent of any edge-discovery work.

**Connal proposed automated paper trades** — Claude deciding simulated entries against a signal,
tracked to a real outcome, no real money, he decides afterward whether to act on results with real
money. Genuinely good and safe: no wallet, no venue, nothing real touched. Design sketch offered:
trigger on signal → record price/time → fixed pre-committed exit rule (never changed after entry,
same discipline `40-POS/` theses already require) → scoreboard vs a real baseline.

**Connal: "dont just jump into building we need to flush this idea out a lot more... we also need
to make a whole strategy for how we are going to trade."** Pivoted fully to strategy-first, no
code. Produced a 7-category question framework: the edge, entry rule, position sizing, exit rule,
exclusion list, validation, and governance/discipline. Asked Connal to work through it. He did, in
full — his actual answers, condensed (verbatim flavor kept where it matters):

- **Edge**: "a combined high-level, industrial-grade analysis of social media data, charts, chart
  trends, real world data, whale activity, and wallet tracking done by a high powered ai." Wants
  both loss-avoidance AND picking winners, short and long term. Believes it won't get arbitraged
  away because "its not a gimmick its simply an analysis of lots of data exactly the way investment
  banks analyze companies." Wants momentum read across multiple data types at once, distinct from
  plain price-momentum-chasing.
- **Entry rule**: "we dont know yet" to every specific question (exact conditions, single vs.
  multiple signals, disqualifiers) — honest, and exactly what the next session is for.
- **Frequency**: wants "a few times an hour... to get good data and trade as quickly as possible."
  ⚠️ conflicts with D-20/D-36 (no sniping, nothing under 2h old). Not resolved — flagged to him
  directly, he did not commit either way beyond openness to reopening it (see exclusions, below).
- **Entry decision-maker**: him initially, "unless in testing you show that you are capable of
  handling it yourself." → led directly to the boundary conversation, see entry #2 below.
- **Position sizing**: "no limit really trade how you like" on position count; per-trade % "depends
  on confidence in the trade and my current financials"; confidence "determined by you [Claude]
  with the input of me... unless you prove yourself capable"; total capital "I need to see results
  before i tell you that." Flagged: no limit isn't testable as stated, and "confidence from Claude"
  needs to be an honest structured score, not manufactured conviction (see area README).
- **Exit rule**: "some combination" of target/stop/time, "a full financial strategy describing
  target gains and risk tolerance" still needed. Varies by coin. Illiquidity override: yes,
  probably. Enforcement: him, with Claude's input, final say his "in the beginning."
- **Exclusions**: NOT committing to keep "nothing under 2h" or "never chase already-moved" —
  "not necessarily, depending on what you accuracy looks like." Same for safety-gate/holder-
  concentration/liquidity-floor exclusions: "not necessarily we need to just identify what we can
  do with those types of coins." No market-wide sit-out condition: "No."
- **Validation**: no fixed n before trusting results, "we have to work on it and try to refine it."
  Falsifier as stated: "lack of consistent profits when the technology is in a state where it
  should be profitable" — flagged as circular, needs sharpening. Baseline as stated: "as long as we
  are making profitable trades at a reasonable expense" — flagged that profitable ≠ proof of edge
  (a rising market lifts everything); pointed at the existing forecasts-vs-market machinery in
  `journal.js: calibration()` as the model to follow. Neither point was resolved to a final answer.
  Paper-trading floor: "at least two weeks."
  Scanner reliability: his own responsibility, matches D-89 ("if it isnt [working] i will fix it").
- **Governance**: rules "probably fully tweakable" — flagged tension with ever getting a clean
  pass/fail read; proposed (not yet agreed) versioned rule-locking per test window instead of
  continuous tweaking. His instinct stated separately — "develop a strategy now and then stick with
  it... adjust the strategy" based on evidence — actually agrees with that proposal, just phrased
  loosely enough to also say "fully tweakable" in the same answer. Worth resolving explicitly next
  time, not assumed either way. No Austin sign-off needed: "if one of us wants to follow with it
  they should be able to spend their own money on it."

## 2026-08-31 — 2. THE PERMANENT BOUNDARY — PUSHED ON DIRECTLY, HELD, WITH REAL REASONING
- machine: connal
- Connal, directly: "id be silly if you are showing in automated testing with no real money that
  you are trading at a good proiecency to not give you the ability to make trades yourself." Asked
  to "be frank."
- Held the line, with actual reasoning rather than a bare rule citation: paper results systematically
  overstate real ones (idealized fills; real capital chasing a signal moves the exact price the
  signal depended on, which never shows up in a backtest); a good stretch in something this volatile
  doesn't separate skill from luck as fast as it feels like it should; and — the strongest point —
  even a fully validated strategy doesn't need Claude holding the trigger, because the right way to
  run a proven rule set is auditable code a human runs, not an LLM's live judgment, which can be
  talked into a bad trade and produce a fluent, confident-sounding justification for one in a way
  fixed code cannot.
- Connal: "we can reopen this later we need results either way." Not conceded, not abandoned —
  parked pending real results. Treat as permanent until Connal explicitly revisits it with data in
  hand; see the README's boundary section.

## 2026-08-31 — 3. SCAN CADENCE, BUDGET, AND TWO REQUESTED FEATURES
- machine: connal
- Asked Connal directly how often the app currently scans and whether it's consistent while
  offline, rather than assume. Checked the real record (24 straight hourly commits, no gaps) and
  the actual code (`fetchHistory` — chart data — is ONLY called from the live desktop app, never
  the cloud collector). Answered precisely: broad market/safety/social/holder checks run hourly,
  reliably, offline; chart history does not accumulate offline at all.
- Connal, asked for a reasoned estimate of needed scan frequency: gave a split answer — discovery
  signals build over hours so ~hourly-to-30-min is probably already close to right and going faster
  mostly just costs money; protecting an existing position from a fast rug needs much faster
  checking, which the app already does at 15s but ONLY while open, and that gap (not the hourly
  scan number) is the real lever for "good results."
- Connal decided, concretely, all three at once: move to every 30 minutes even if it costs more;
  build a way to catch a fast liquidity pull while offline; build some chart history for Claude to
  analyze.
- Clarified before building: raising the X budget to the $24 Connal had already named would blow
  past the existing $20/mo ALL-IN hard cap by itself — surfaced explicitly rather than silently
  implemented or silently ignored. Connal: "i understand we will need more money and am okay with
  it." Set X cap $24, ALL-IN ceiling $30, cadence `:12,:42` (twice hourly) — SHIPPED, see the area
  README's "shipped" section and D-90.
- Liquidity-pull alert channel: asked, Connal chose Telegram ("if we could get it on our phones").
  NOT built — needs his bot token and a real answer on whether GitHub Actions' scheduler can
  actually deliver sub-hourly reliably (unproven — see area README).
- Chart history scope: asked watchlist vs. whole-market vs. something in between; Connal answered
  "some in between... is there a way you could be identifying which coins we should be tracking by
  doing a bunch of deep research" — which redirected the conversation into the discovery-gap
  question below rather than landing on a chart-history scope. Not resolved.

## 2026-08-31 — 4. THE DISCOVERY GAP — CONFIRMED STILL REAL, PARTIAL FIX ALREADY EXISTS
- machine: connal
- Connal asked whether Claude could do "deep research" to identify which coins are worth tracking,
  rather than relying on whatever the scanner already surfaces.
- Checked the actual code rather than repeat an old vault claim: `screener.js` still only sources
  candidates from DexScreener's newest-profile listings, DexScreener's paid/promoted listings, and
  GeckoTerminal's trending-by-volume pools — three sources, all either too-new-to-judge or
  already-popular. The long-documented "momentum-biased discovery" gap is confirmed still true
  today, not stale.
- Was explicit about what "AI does deep research" can and cannot honestly mean: an LLM freelancing
  open-ended web research on a schedule isn't cheap, repeatable, or reliable, and its output ("this
  coin looks promising") would be exactly the ungrounded, unfalsifiable signal this project has
  avoided everywhere else. What IS real and partly built: `shared/resolve.js`'s
  `unknownTickers()`/`identify()`, already finding tickers ≥3 different real people are organically
  discussing and resolving them to a contract address — grounded in actual people, actually
  talking, not a guess. Currently display-only in the sector view; never feeds tracking.
- Connal agreed this should be developed as its own real thread (not folded into the chart-history
  question). Posed the open questions in the area README's discovery section — none answered yet
  before the conversation moved to closing out this handoff.

## 2026-08-31 — 5. HANDOFF REQUESTED
- machine: connal
- Connal, mid-sentence proposing a $100 paper-trading budget split across coins, interrupted himself:
  "can you make a handoff file for this chat the next chat will be focused on building the part
  that actually picks coins to buy/sell so lets focus on that."
- This area (`70-AREAS/trading-strategy/`) created in response. The $100 figure is real and stated
  — "start with an 100$ budget and split it up into different coins while you are testing" — but
  the split itself was never worked out; it was the sentence being written when he redirected to
  asking for this handoff. Next session: pick this up starting with the entry-signal/coin-picking
  algorithm, per his direct instruction, not the $100 split first unless he says otherwise.

## 2026-09-01 — 6. ARCHITECTURE RESEARCH FOR THE COIN-PICKING ALGORITHM
- machine: connal
- Connal, starting the session he pre-declared in the handoff: he is designing the algorithm that
  reads the market-data sector and the social-tracking sector and turns them into confidence levels
  and buy/sell indicators for individual coins and market alerts. Asked for deep research on the
  best ORGANISATION systems for a project of this shape.
- Written up in full: `60-KB/signal-architecture-research.md` (companion to
  `60-KB/social-signal-research.md` — that one is WHAT to extract, this one is HOW TO ARRANGE it).
- Headline finding: direction and confidence must be two separate stages, not two outputs of one
  algorithm (meta-labeling, López de Prado). This directly answers the README's open
  "'confidence' scoring — Connal wants it 'determined by you'" worry: confidence becomes a scored,
  falsifiable second stage with its own track record instead of an LLM's assertion.
- Second finding with a direct bearing on an open question: the "rule-tweaking discipline" tension
  (fully tweakable rules vs ever getting a clean answer) has a citable resolution — the Deflated
  Sharpe Ratio / Probability of Backtest Overfitting work shows the probability of picking an
  overfit rule grows fast with the NUMBER OF TRIALS. ∴ the discipline is COUNT THE TWEAKS and quote
  the count beside any result, plus a shadow lane for challengers. Proposed, not yet agreed.
- Explicitly REJECTED after reading it: Dempster-Shafer evidence theory as the fusion layer. It is
  the obvious-looking fit for "several unreliable sources that disagree" and it fails exactly where
  we would need it (Dempster's rule misbehaves as conflict → 1), and it fights D-50 by existing to
  collapse conflict into one number.
- Also rejected: any fitted/optimised signal weighting at this sample size. The 1/N literature says
  equal weights are hard to beat out of sample and robust optima converge to equal weight as
  ambiguity rises.
- Live hazard surfaced, not previously written down: the app's live state and `data/*.jsonl` can
  disagree by up to the cron interval, so designing a rule against one and evaluating it against
  the other is training-serving skew and would manufacture a fake edge. Must pick one surface
  before any picker is built. NOT yet fixed.
- Nothing built this session — research only, per the request.

## 2026-09-05 — 7. WASH-TRADE FILTER BUILT, REAL TREND-VS-GROWTH ANALYSIS, WORK HANDED TO AUSTIN
- machine: connal
- Connal asked for the wash-trading filter flagged as the next real step in
  `[[80-WHISPERS/whale-tracking/README]]` (step 2 of that file's build order) to actually be built.
- **Built `app/shared/washtrade.js`** — two signals, both cited from Victor & Weintraud (WWW 2021):
  same wallet buying AND selling one coin in a window (self-trade), and wallets funded in SOL from
  the same source (funding-link cluster). Tested against a synthetic case (confirmed it flags a
  real self-trade) and a real run against CATE's live pool flow (ran cleanly, 0 flagged on a small
  sample — proves the mechanism works on real chain data, not that CATE has no wash trading; n too
  small either way). Full detail and the honest limits (bounded lookback, RPC-capped, "unchecked"
  is a real third state, never silently read as clean) in the whale-tracking file. ! NOT wired to
  any screen, alert, or admission score yet — same discipline as `walletflow.js` itself.
- Connal also asked, same session, to expand how new coins get found (a list of coins upticking in
  trend) and for analysis of whether a price uptick actually coincides with holders growing, market
  cap growing, or neither. The growth-type question was answerable RIGHT NOW from data already
  being collected — `data/market.jsonl` already carries holders + top1 history for several coins.
  Built `app/tools/backtest-trend-growth.py`, ran it for real: **CATE and DOGE-1 (this project's
  two longest-tracked coins) show price rising WITH holder count growing (r=+0.22, +0.26) — real
  people joining, not just re-pricing. LaPeace shows the opposite (r=−0.45) — price rose while
  holders left**, the shape of a shrinking group re-pricing the same coin, and it is a coin Connal
  later removed from the watchlist. Full write-up, all caveats (per-coin only, watchlist-bias,
  autocorrelation — same discipline as the social backtest two days ago) in
  `[[60-KB/trend-growth-analysis]]`. ! nothing here feeds `admission.js` yet, same "prove it first"
  rule as every other finding this week.
- The trend-UPTICK discovery expansion (a list of coins moving before anyone posts or trades them)
  was first logged here as needing new infrastructure — WRONG, corrected same night below.

## !! CORRECTION, SAME NIGHT — the trend-record already existed, T-023 was checked against the wrong file
The line above was written after checking `screener.js` and `data/market.jsonl` but NOT
`cloud-collect.js`'s own append call — the exact "read the files, not the commits/code path" gap
`00-INDEX.md` warns about, just inside one file instead of across a git history. Checked properly:
`cloud-collect.js: main()` already appends every scan's survivors to `data/candidates.jsonl` on the
same twice-hourly cadence as everything else — 3,480 rows, 120 distinct coins, **87 of them seen 3+
times across an 8.5-day span**, measured live, not assumed. The trend record was already there.
- Built `app/tools/find-trending-candidates.js` — ranks untracked candidates by price move from
  first-to-last scan AND how CONSISTENT that move was (most individual steps agreeing on direction,
  not one spike). Real run: 56 untracked coins had enough history to rank. Top mover, `stonkape`,
  was +519% over 17.5h but only 57% consistent — most "winners" in this ranking sit at 40-60%
  consistency, barely above a coin flip, meaning most of what looks like a climb in this pool is
  volatile back-and-forth, not a clean sustained trend. ! `est:` conf 40% that "consistency" as
  computed here separates real trend from noise — worth checking against later outcomes before
  trusting it, same discipline as every other fresh metric this week.
- ! same source bias as everything `screener.js` finds: the universe is still only DexScreener's
  newest/promoted listings + GeckoTerminal's trending-by-volume — already-new or already-popular.
  A sustained climb inside that universe is real and checkable; it does not fix what gets INTO the
  universe in the first place.
- NOT wired to `admission.js` or the real watchlist — a report only. `main/index.js`'s own
  discovery comment already states the discipline: one path wired and proven before the next is
  added (FOMO is wired; social ticker-resolution, already computed, is the stated next candidate,
  not this). Whether a sustained-uptick candidate should ever auto-admit is Connal's call.
- Connal decided to put the list on screen anyway, unproven, on condition testing continues:
  "we will have to continue to do analysis of our records on what this data does ... please run
  tests on it even though it is still on display." Ran a real walk-forward test the same night,
  not deferred — `app/tools/backtest-trend-candidates.py`: does the consistency score, using only
  data available at the time, predict the coin's NEXT move? **40 coins tested, 5 significant, but
  the three best-sampled coins (fone n=295, OTC n=290, STONK n=268) all came back at ~zero — the
  significant hits are concentrated in the SMALLEST samples, the classic shape of noise clearing a
  significance bar rather than a real effect.** Full write-up
  `[[60-KB/trend-candidate-walkforward]]`. ∴ the list can go on screen (Connal's call, nothing
  dangerous about a flagged observation) but must display as an unproven observation, never a
  score that implies it predicts anything — added to Austin's queue as T-026.
- Connal pushed back hard, correctly, on how that result was framed: a post only moves price while
  Twitter's own algorithm keeps surfacing it (a short shelf-life), and separately, some posts carry
  a genuinely LONGER-horizon signal — his example, DOGE-1 posts connecting the memecoin to the real
  Dogecoin-funded rocket mission, which could have flagged an early entry before the mission's own
  news caused a real +200% spike (Nov 2025, `[[news-catalyst-research]]`). His point: a null result
  on one specific rule was said in a way that read as "this data isn't real," which is wrong — the
  data is real, only the tested RULE failed. Re-ran `backtest-social-signals.py` specifically to
  check his shelf-life idea: several features DO show a real rise-then-fade shape pooled across
  coins (peaking ~6-12h, gone by 24h) — consistent with his theory — but the same per-coin check
  that broke the original findings breaks this one too, no exceptions. The catalyst-post idea
  (DOGE-1/rocket) cannot be tested on our own data — that event predates this project entirely —
  but DOGE-1 is one of only two coins with a long clean history, making it the one to watch if a
  similar real story happens again. Logged T-027: build a way to separate hype-burst posts from
  real-world-story posts before testing either — right now both are lumped into one number that
  may fit neither. Full write-up appended to `[[60-KB/social-signal-backtest]]`.
- Connal asked directly for a way to get this session's work in front of Austin so he knows what to
  build. The existing task system (`90-TASKS/`) is exactly this mechanism — added T-020/T-021 to
  `austin.md`: a real screen for `admission.js`'s reasoning (D-117 already requires this and it does
  not exist yet), and a way to show wash-trade flags wherever wallet activity reaches a screen, so a
  raw count never displays manufactured activity as real interest. `BOARD.md` regenerated to match.
- Built the concrete answer to T-027's real-world-story half, same night: a full design already
  existed, unbuilt, in `[[60-KB/news-catalyst-research]]` (09-04) — Google News RSS, searched per
  coin by a person-set `newsQuery` keyword, never a generic crypto-news API (already checked and
  rejected there: those filter by exchange ticker and would never surface DOGE-1's real story,
  which is aerospace-media coverage, not crypto-media coverage). Added DOGE-1's query to
  `data/watchlist.json`, built `app/main/adapters/newsfeed.js`, wired into `cloud-collect.js` on the
  existing free cadence. **Real, live run found genuine headlines suggesting the actual rocket
  mission may be close to launching** — "Musk is putting Dogecoin on the moon in 28 days"
  (thestreet.com, 08-17) and "Dogecoin Targets $0.10 Ahead of DOGE-1 Lunar Launch" (Cryptonews,
  09-03) — a real, dated, checkable finding on a coin Connal holds, stated as a headline existing,
  not as a confirmed date (that needs reading the source article, not arithmetic on a headline).
  - Found and fixed a real bug live: Node's own network layer was silently served an
    empty-but-valid result by Google's anti-bot layer, on the exact same query `curl` answered
    correctly — same silent-failure shape as D-85, a new source of it. Worked around with
    `execFile('curl', …)` isolated to this one adapter, not the shared fetch wrapper. ! `curl`'s
    presence on the Hetzner host is assumed, not yet confirmed.
  - Also filtered exchange/converter boilerplate ("Convert DOGE-1 to Yen") that matches any ticker
    query regardless of real news, by title pattern, not by source.
  - NOT wired into `admission.js` or alerts — a real, growing record (`data/news.jsonl`) with
    nowhere to look at it yet. Added to Austin's queue as T-028.
- Connal then asked directly for general crypto news too, not only the per-coin catalyst check.
  Added a SECOND pillar to the same file, kept distinct (`kind: 'catalyst'` vs `kind: 'crypto'`,
  never merged into one score — they answer different questions, same reasoning as keeping
  market/social/wallet as three sensors instead of one blended number): `collectCryptoNews()`
  sweeps four named crypto outlets (Cointelegraph, Decrypt, The Block, Bitcoin.com News — verified
  live, no anti-bot issue like Google News had) and checks every headline against the watchlist too,
  in case a tracked coin gets real crypto-media coverage. Real run: 50 headlines, 0 matched a
  tracked coin — honest, not a bug; these coins are too small for mainstream crypto press.
- Connal pushed further, correctly: he doesn't want this limited to DOGE-1's one known story — he
  wants to catch "the next DOGE-1" before anyone has identified it, plus a way to watch for
  Elon/Trump-style influential posts, plus real ANALYSIS of news for coin/market connections, not
  just a list. Answered each honestly rather than building blind:
  - Built `collectSelfNameNews()`: runs every watchlist coin's own name through the same search,
    no curated query needed. Confirmed live it would have found DOGE-1's story on its own. Then
    immediately proved, same method, why it can't be auto-trusted: `CATE` returned Cate Blanchett
    news, `BONER` returned FDA drug-recall news and real funeral obituaries for people surnamed
    Boner, `microduck` returned an unrelated Hugging Face robot — all real articles, zero
    connection to the coins. Every row ships `confirmed: false`; a person has to say yes before any
    of it is treated as real. Also found two genuinely useful hits the same run (BONER's real
    Hims & Hers connection, CASHCAT's Robinhood Chain ecosystem, both worth him seeing).
  - Elon/Trump tracking: already researched in full, `[[80-WHISPERS/analysis-algorithm/README]]`
    "HALF A" — real-time account-watching is a BUDGET decision (competes with the $24/mo social
    cap), not a free feature; Truth Social has no covered source at all. What's free today: news
    coverage OF a viral post, already flowing through the pillar above.
  - "Analyze for connections" stays a human judgment call, not an automated verdict — the
    CATE/BONER/microduck results are the direct, same-night proof of why: the identical mechanism
    that correctly found DOGE-1's real story would, with equal confidence, invent a connection to
    an unrelated actress or robot if nothing checked it. Full reasoning in
    `[[60-KB/news-catalyst-research]]`.
- Connal filled in the `[[OPEN-QUESTIONS]]` doc directly and pushed back hard on one pattern: I was
  gating VISIBILITY on proof, when he wants evidence shown, honestly labelled, always — logged as
  D-119. He also settled position sizing has no hard cap, sized by combined confidence, his call
  final — D-120, with the mandate's advisor line explicitly held regardless (he was clear this
  isn't him overriding that line, and it doesn't move even so).
- Then, mid-reply, he said to build everything that had been on hold. Did the concretely-scoped,
  bounded pieces same night, honestly reporting what didn't fit:
  - **The labelled outcome record — the single most-repeated gap in this whole vault — is now
    LIVE.** `shared/labels.js` (triple-barrier, same TARGET/STOP/TIMEOUT constants as
    `backtest-walkforward.js`, no new untested rule variant) + reused `journal.js`'s existing
    forecast/calibration machinery rather than building a parallel one. Every real admission now
    auto-logs a resolvable forecast at its real entry price; `cloud-collect.js` resolves open ones
    every cycle against real price history. Verified end-to-end against real CATE data before
    trusting it (correctly resolved a synthetic test as a timeout at -14.5%), test artifact deleted
    after.
  - **T-030, the news filter**: self-name candidates now require the headline to actually mention
    crypto. Re-ran the exact CATE/BONER/microduck cases — all four false positives gone, both real
    hits (BONER/Hims & Hers, CASHCAT/Robinhood Chain) survive.
  - **Robinhood Chain researched**, `[[60-KB/robinhood-chain-research]]`: real chain (Robinhood
    Markets' own L2, Arbitrum Orbit, chain ID 4663). Live price already works today (DexScreener
    covers it, confirmed) — this was already true, just never checked. Raw RPC works too (confirmed
    live), so a wallet-flow reader is buildable later. The historical-candle gap
    (`admission-backtest.md`) stands: GeckoTerminal doesn't cover it and the human-facing Blockscout
    explorer is Cloudflare-blocked to a plain script.
  - **curl on the collection host — confirmed present**, live via SSH. No longer an assumption.
  - **Elon/Trump tracker — researched, NOT built.** X has no native macOS app any more, so the
    exact FOMO-notifications trick doesn't transfer as-is; the real next test (a browser's own
    web-push notification for x.com landing in the same local notification store) is untested but
    plausible. ! did not touch the notification database beyond FOMO's own scope to check this —
    `fomonotifications.js`'s own header requires fresh, explicit consent before widening that query
    to any other app, and "build everything" isn't that — asked directly instead of assumed.
  - **Not done this session, queued honestly rather than rushed**: wallet-derivation research
    (whale-tracking build-order step 4), chart-history-from-existing-data, a scheduled-dates
    calendar, and the pump-duration-after-a-post measurement. All added to `[[OPEN-QUESTIONS]]` and
    the task board rather than half-built under time pressure.
- Asked to just use judgement and clear the backlog. Picked the ones actually completable without
  Austin or an external action, real results each:
  - **T-012 answered**: the manipulation detector now fires on 30 of 567 recent readings (5.3%),
    up from the 3-of-376 that prompted the task — consistent with D-104's recalibration, not a new
    fix. It does fire.
  - **T-011 checked for the first time, real data**: joined 4,391 real "emerging" posts to real
    price history. 23 tickers matched, 62% hit their profit target before their stop (n=21
    resolved) — a real improvement over the 11%-hit-rate market-only rule from 09-02. ! NOT
    trustworthy yet: n small, a real entry-timing bias risk identified and not fixed, and only the
    single largest win (BIKETYSON +333%) spot-checked against the raw data before being believed —
    it held up (liquidity moved with price, unlike a real bug this project already hit once).
    Full write-up `[[60-KB/emerging-signal-backtest]]`.
  - **T-033 built and run for the first time**: `app/tools/derive-wallets.js` — real Solana movers,
    real wallet flow, wash-filtered, checked for repetition across different coins. Found ONE
    wallet buying into two different real movers. n=1, nowhere near enough to trust, but the whole
    mechanism (whale-tracking build-order step 4) now runs end to end for the first time.
  - **Real bug found along the way, not just a result**: STONK's price history contains an
    impossible +1,449,410% reading — checked the raw data, it's a bad quote sandwiched in an
    otherwise smooth series, same shape as D-117's stablecoin-mispricing bug, on a path D-117's fix
    never covered (`candidates.jsonl`'s scanner ingestion, not the portfolio price series). Logged
    as T-037 — this could feed a fake signal into anything that reads that file's price field.

## 2026-09-05 — 8. WALLET-DERIVATION KILLED, PUMP-DURATION CAPTURE BUILT
- machine: connal
- Connal killed the wallet-derivation idea outright ("this idea is dumb i dont want this") right
  after seeing the real n=1 result — no reason given, none asked for per the mandate's decision
  hygiene, logged and stopped. `80-WHISPERS/whale-tracking/README` marked X KILLED; the sell-side
  wallet tracking and the wash-trade filter are unaffected — this was specifically about deriving a
  "smart wallet" list.
- Asked what to build next. Picked the pump-duration measurement
  (`80-WHISPERS/analysis-algorithm/README`'s own long-flagged, never-started next step) — same
  reasoning as the labelled-outcome record: it can only ever be answered from data collected AFTER
  a recorder exists, and every day without one is unrecoverable. Built `app/main/pumpcapture.js`:
  every real FOMO buy signal (tracked or not — gating on admission would exclude most of the
  denominator, D-63) now starts a real 2-hour, ~90-second-interval price recording tagged with its
  trigger. Tested live against real CATE data before trusting it, test row deleted after. n=0 until
  a real signal fires while it's running — the mechanism is proven, the record starts from here.
- Told to work through the rest of `[[OPEN-QUESTIONS]]` and report back. Three more real builds:
  - **The admit/reject spectrum Connal asked for exists now** — `admission.js` gained a `tier`
    field (`red`/`yellow`/`green`) computed from the EXACT SAME gates-then-vote logic already
    there, nothing new invented: red = a gate failed, green = cleared the real admit bar (still the
    only thing that actually triggers a watchlist add), yellow = cleared every gate but fell short
    — real evidence, not enough of it, exactly the D-119 "show it, labelled" shape. Also added news
    as a genuine 4th sensor (confirmed hits only — an unreviewed self-name candidate must never
    vote, that's the Cate-Blanchett risk verbatim). Tested all four cases (yellow/green/red/news
    tipping a vote) live before trusting it. `tier` is display-only for now — nothing acts on
    'yellow' automatically, that would be a real decision to widen what's actionable, not mine to
    make silently.
  - **Chart history fallback built** (`shared/chartfallback.js`) — turns the price snapshots
    already collected every cycle into the SAME candle shape `geckoterminal.js`'s real OHLCV
    returns, so existing chart code can render either. Every point honestly labelled
    `synthetic: true` (a single reading, not a real aggregated candle) so nothing downstream
    mistakes it for the real thing. Tested against real CATE data (300 real points). Wired into
    `tokens:refresh` as `out.historyFallback`, alongside the real history, never replacing it.
  - **A real scheduled-dates calendar built** (`shared/calendar.js`, `data/calendar.json`) —
    refuses to accept an entry without a real source, and marks anything computed from a headline
    (not independently confirmed) as `estimated`, never silently rounded into a fact. Seeded with
    the one real date this project has: DOGE-1's estimated launch window (~09-14, computed from
    "28 days" in an 08-17 article) — sourced, flagged as an estimate, not asserted as firm.
  - **Verified no regressions**: ran the full test suite before and after tonight's changes
    (`git stash` / `git stash pop`) — `history.test.js`, `importance.test.js`, and `sweep.test.js`
    fail identically on BOTH, meaning these are pre-existing, unrelated to anything built tonight,
    not something newly broken. `sweep.test.js`'s failures look like the same stale-fixture shape
    as T-018 (asserting old budget/rate numbers a real config change already superseded) — not
    dug into further tonight, flagged as its own item.

## 2026-09-05 — 9. THE RESEARCH ASKS FROM THE QUESTIONS DOC, DONE PROPERLY
- machine: connal
- Connal asked directly whether I'd actually done the RESEARCH he asked for, not just the builds.
  Honest answer at the time: partly. Three research items from `[[OPEN-QUESTIONS]]` had been passed
  over while building — the wash-filter rework, the push-notification question, and extending the
  holders-vs-price work. Done now, all three, with real sources.
- **Wash-filter rework → `[[60-KB/market-manipulation-research]]` + `app/shared/marketmanip.js`.**
  !! The headline finding changes how every win rate in this project should be read: fact
  @Mongardini & Mei (arXiv 2507.01963, 34,988 tokens across four chains) — **82.8% of high-return
  memecoins (>100% gains) show evidence of artificial growth**. Every selection mechanism here
  (trend list, "notable movers", the emerging-signal backtest's +20% wins) samples exactly that
  population.
  - Implemented the two detectors the literature recommends (volume-without-price,
    price-without-volume), ran them over all 128 coins: **2% flagged, and the one flagged "winner"
    was our own known price bug.** Root cause found by running rather than assuming — those
    thresholds need per-TRADE data; this project has 30-min snapshots of 24-HOUR aggregates, so a
    "5x volume spike vs the previous reading" essentially cannot fire. A real negative result.
  - ✓ Fixed with a third detector fitted to the data actually available: **price rising while
    holder count does not** — which is `[[60-KB/trend-growth-analysis]]`'s own earlier measurement
    turned into a manipulation check. Result: flags LaPeace (independently the same coin that
    analysis singled out, and the one Connal removed) AND **`cat`, one of the 13 "wins" behind
    tonight's 62% emerging-signal hit rate** (+82% price, −7.3% holders). At least one of those
    wins looks manufactured — exactly what the 82.8% base rate predicts, found in our own data.
    `[[60-KB/emerging-signal-backtest]]` updated with that caveat rather than left standing.
- **Push-notification question → `[[60-KB/alert-threshold-research]]`.** Answer: no. Best practice
  is a <10% false-positive rate for anything allowed to interrupt a person; measured reality when
  that slips — 46% of security alerts are false positives, 74-99% of clinical alarms non-actionable,
  49-96% override rates. The self-name news pillar measured ~50% false positives before filtering,
  five times the ceiling. ∴ GREEN tier push-eligible, YELLOW in-app only, self-name candidates never.
  ! this does not conflict with D-119 — showing and interrupting are different acts, and D-114
  already reached the same conclusion by instinct on Connal's own alerts.
- **Holders-vs-price extension**: rather than re-running the same finite dataset for a marginally
  different correlation, the real extension turned out to be the one above — it became the only
  manipulation detector that works at this project's data granularity, which is a genuinely new,
  tested use rather than a repeat of the same measurement.

## 2026-09-05 — 10. THE HOLDER READ WIRED INTO THE LIVE SYSTEM
- machine: connal
- Connal: commit it, then build this asap. Committed (two commits, code+vault and data separately),
  then wired `marketmanip.js: growthQuality()` from a script that had been run once into something
  that runs every collection cycle: `cloud-collect.js: writeGrowthQuality()` computes it per tracked
  coin, writes `data/growth-quality.json`, exposed to the app over `growth:quality` + preload.
- ! Ran against his REAL watchlist, and it says something about a coin he holds:
  - **CATE: crowd-leaving-whale-staying** — price −50%, holders −53%, biggest wallet's share up.
  - **DOGE-1: real-looking-growth** — price +117%, holders +18%, biggest wallet's share down 1.6pts.
    The only coin of the seventeen with holder history that shows the healthy shape.
  - CASHCAT / BONER / microduck return `unknown` and say so — holder counts are Solana-only, and an
    absent input is reported as absent, never guessed (D-29).
- ∴ per the mandate's "surface disconfirming evidence FIRST when they are already in a position",
  the CATE read was told to him directly rather than left sitting in a file.

## 2026-09-05 — 11. THE PRICE-SANITY FIX, THE CONTINUOUS RESCORE, AND THE ENTRY RULE
- machine: connal
- Connal: build all three and check they work. Done, in dependency order — the data fix first,
  since everything else reads that data.
- **T-037 fixed → `app/shared/pricesanity.js`.** The rule is evidence-based, not a guessed
  threshold: measured across every large consecutive price move in the whole history, real moves
  and bad quotes separate on ONE thing — whether LIQUIDITY MOVED WITH THE PRICE.
  real: biketyson 4.3x price / 3.6x liq · fone 6.4/3.8 · CTO 3.7/4.3 · SOLCAT 3.7/2.9 · Sue 3.1/1.8
  bad:  STONK 11,688x / 1.4x · STONK 14,495x / 1.4x · **CASHCAT 2.7e27x / 165x** (a second corrupt
  coin nobody knew about, found by the same pass).
  - Verified: **3 rows flagged out of 4,577 (0.07%), and 0 of 597 readings across the six real
    movers.** Catches exactly the known-bad, no false positives.
  - ! only UPWARD spikes are ever flagged — a price collapsing while liquidity holds is what a rug
    looks like, and suppressing that would break the most valuable alert this project has (D-70).
  - Wired into the label resolver FIRST (a bad quote would have written a permanent false "target
    hit" into the calibration record), then growth quality, the chart fallback, and the trend list.
- **The continuous rescore + the entry rule → `app/shared/rescore.js`.** Runs every tracked coin
  through every available sensor each cycle (`cloud-collect.js: writeRescore` → `data/rescore.json`).
  THE ENTRY RULE, stated: **admission's own GREEN bar AND the coin is not in a known-manufactured
  shape.** That second clause is the new part and the whole point — the sensors are LOUDEST during
  a manufactured pump, because manufacturing loudness is the technique. 82.8% of >100% gainers are
  artificial (arXiv 2507.01963); 1 of 17 of our own coins showed real growth.
  - ! `unknown` growth (a brand-new coin with no history) blocks nothing — absent data is not
    evidence against (D-29). Only a KNOWN-bad shape vetoes.
  - Verified on four real cases: CATE (every sensor positive, vetoed to yellow because holders are
    leaving) · DOGE-1 (green, entry-worthy, growth supports it) · a new coin with no history (not
    penalised) · a safety-gate failure (stays red regardless). Gates still outrank everything.
- **Two real bugs found by checking rather than assuming it worked**, both in my own wiring:
  1. the news vote never fired. `admission.js` demands an explicit `confirmed === true`; rows
     written before that field existed have it MISSING, so they failed a check they were never
     meant to fail. Fixed by NORMALISING at the read boundary rather than loosening admission's
     check — that strictness is what stops an unreviewed self-name candidate from voting.
  2. rescore read `news.jsonl` BEFORE the news step appended that cycle's rows, so it was always
     one cycle stale. News now runs before scoring.
  - ∴ DOGE-1 now scores **green and entry-worthy** on real data — market + a confirmed real-world
    news hit, with the growth shape supporting it. The first coin to clear the new bar honestly.
