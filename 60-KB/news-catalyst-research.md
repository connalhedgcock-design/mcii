---
id: kb.news-catalyst-research
t: kb
v: 5
upd: 2026-09-05
machine: connal
prio: high
---
# NEWS & REAL-WORLD CATALYSTS — how established tools work, and how to build our own
!! researched 2026-09-04 on Connal's instruction: research established social trackers to see if
we're doing this optimally, and build a system to detect real-world catalysts (his own example:
the DOGE-1 rocket), synthesized with the other indicators. Companion to
[[social-signal-research]], [[signal-architecture-research]] and [[social-signal-backtest]].

## !! READ THIS FIRST — THE DOGE-1 CHECK THAT CAME OUT OF DOING THIS RESEARCH
Verified directly, not assumed: the Solana coin `DOGE-1 Satellite` (`DpBzjtgGLF7QA9Ug3eUVGbnqa6j3jvYBn1XuQuktvfhm`,
created 2025-08-12) is **not** the real, Dogecoin-funded lunar mission run by Geometric Energy
Corporation — that mission is real, delayed since 2021, currently reported as slipping past
September 2026. The token is an unaffiliated memecoin that borrowed the name; its own community
channels are meme-branded (`@doge1meme`, `t.me/DOGE1memesol`), and no statement from GEC or Elon
Musk endorses it. ✓ fact @multiple independent reports, one specifically stating "not an official
project... no official endorsement". ! this does NOT mean the coin is unaffected by mission news —
it jumped +200% in Nov 2025 purely on speculative reaction to an Elon post about the REAL mission.
∴ the catalyst system below must frame this as **narrative correlation**, never as **fundamental
exposure** — the coin has no claim on the mission succeeding, only a documented history of traders
speculating on it when the mission makes headlines. Framed correctly, this is a genuinely strong,
already-observed-once test case for exactly what Connal asked to build.

## PART 1 — WHAT THE ESTABLISHED TOOLS ACTUALLY DO, AND THE TWO THINGS WORTH NOT COPYING
- fact @LunarCrush (Galaxy Score): a composite of **price appreciation, social engagement/impact,
  average sentiment, and correlation of volume to price** — i.e. it puts a PRICE component inside
  its "social" score. ✓ they also weight by "account authority" and filter spam/bots before
  aggregating — same instinct as `shared/credibility.js`, already built here, independently.
- X **DO NOT COPY**: blending price into the social score makes it partly LAGGING by construction —
  it cannot cleanly answer "is attention rising independent of price", which is the one distinction
  `20-SPEC/scoring.md`'s DIV metric already protects (attention with no price move vs. price with
  no attention are different signals; a blended score erases that difference).
- fact @LunarCrush "Social Dominance": a coin's share of the WHOLE MARKET's social volume — a
  cross-coin comparison. X **DO NOT COPY, and this project just proved why**:
  [[social-signal-backtest]] found tonight that pooling different coins into one statistic produces
  numbers that flip direction depending which coin you isolate. `20-SPEC/scoring.md` already banned
  cross-token comparison on instinct ("never compare CATE mentions to DOGE mentions") — tonight's
  backtest is the receipt that the instinct was correct, and social dominance-style metrics are
  exactly the shape of number that instinct rules out.
- fact @Santiment: combines social + **development activity (GitHub commits)** + on-chain, and
  states the pattern plainly — "if sentiment is strong but dev activity is flat and on-chain usage
  is weak, the move is mostly narrative-driven." ✓ WORTH BORROWING THE PRINCIPLE, not the metric:
  dev activity means nothing for a memecoin (most have no real codebase), but the STRUCTURE —
  an independent "is this grounded in something real" pillar, checked separately from social
  volume — is exactly what a news/catalyst pillar should be for THIS project. Real-world news is
  our equivalent of Santiment's dev-activity check: a third, independent read that can confirm or
  contradict what social volume alone is saying.
- ∴ the overall verdict: MCII's existing instincts (per-coin history not cross-coin, credibility-
  weighted counting, keep sentiment and manipulation separate) already match or improve on what the
  market leader does. The gap is not methodology, it is **coverage** — LunarCrush/Santiment ingest
  billions of posts across many platforms; MCII reads one budget-capped X sweep. Optimality here is
  mostly a spending question already being managed (D-108 etc.), not a methodology one.

## PART 2 — A NEWS/CATALYST PILLAR, DESIGNED FOR WHAT THIS PROJECT ACTUALLY COVERS
The tempting-sounding option (a general crypto-news API) is the wrong shape for this project's
actual coins:
- fact @CryptoPanic (the standard free-tier crypto news aggregator): filters by well-known ticker
  symbols on major exchanges. A $200k pump.fun coin, or a coin whose real "news" is aerospace
  industry coverage (DOGE-1's actual case) rather than crypto-outlet coverage, will not appear in
  it. ! a crypto-news feed is the wrong tool for a coin whose relevant news lives outside crypto
  media entirely — checked, not assumed, given DOGE-1 is exactly this case.
- ✓ RECOMMENDED INSTEAD: **Google News RSS, searched per coin by keyword, not by ticker.**
  `https://news.google.com/rss/search?q=<terms>` — verified live, free, no key, no rate-limit
  friction observed. Searches the OPEN WEB's news coverage, not a crypto-specific outlet list, so
  it would have caught DOGE-1's real driver (SpaceX/GEC coverage) that a crypto news API would not.
  ! ToS note, read and respected: Google's own feed license states "personal, non-commercial use"
  — matches this project's existing D-13 posture already, nothing new to accept.
- **design**: each watchlist coin optionally carries a `newsQuery` — the real-world name/entity it
  borrows or claims association with (for DOGE-1: `"DOGE-1" OR "Geometric Energy Corporation"`),
  set by a person (same D-16 pattern as the coin and wallet lists — the ALGORITHM does not decide
  what a coin's story is, a person names it once, cheaply). No query = no news pillar for that coin,
  which is the correct default for a coin with no real-world story to check.
- **what gets stored per hit**: headline, source, published date, and matched coin — never a
  price/buy inference, same restraint D-96 already applies to alerts.
- ! FRAME EVERY MATCH AS NARRATIVE CORRELATION, NEVER FUNDAMENTAL EXPOSURE, worded explicitly on
  screen — "news about the story this coin's name references" not "news affecting this coin" —
  the DOGE-1 finding above is the reason this distinction has to survive into the UI text itself,
  not just live in this file.

## PART 3 — THE OTHER TWO THREADS THIS TIES BACK TO, NOW WORTH REVISITING
- **"Important tweets" / influence weighting** — already researched in depth,
  [[80-WHISPERS/analysis-algorithm/README]] "HALF A". Verdict then: buildable, needs no new data
  (follower/account fields already collected), blocked only on the budget tradeoff of watching
  specific accounts instead of the broad sweep. ! unchanged tonight — still his call, not answered.
- **How long a pump lasts after a big post** — same file, "THE MEASUREMENT CONNAL ASKED FOR".
  Blocked on 09-01/09-02 by not accumulating minute-level price history. ! WORTH RE-OPENING NOW:
  the always-on Hetzner host (D-98) and the FOMO notification reader (built tonight) did not exist
  when that block was written. The pieces needed — a trigger (a big post or a big FOMO signal) plus
  a short window of frequent price checks after it — are closer to buildable than they were three
  days ago. Not built tonight; flagged as newly-unblocked, worth a session of its own.

## ∴ BUILD ORDER, IF THIS IS NEXT
1. ✓ DONE 2026-09-05 — `newsQuery` added to `data/watchlist.json`'s DOGE-1 entry:
   `"DOGE-1" OR "Geometric Energy Corporation"`. No other coin has one — none has a documented
   real-world story, and inventing one would be exactly the fabricated-lore the mandate bans.
2. ✓ DONE 2026-09-05 — `app/main/adapters/newsfeed.js`, wired into `cloud-collect.js: main()` on
   the existing cadence, zero marginal cost (Google News RSS, no key). Real run, same night:
   **found real, dated headlines suggesting the ACTUAL rocket mission may be close to launching** —
   "Musk is putting Dogecoin on the moon in 28 days" (thestreet.com, 2026-08-17) and "Dogecoin
   Targets $0.10 Ahead of DOGE-1 Lunar Launch" (Cryptonews, 2026-09-03). ! stated as fact-of-a-
   headline-existing, not as a confirmed launch date — the actual date needs reading the source
   articles, not arithmetic on a headline. Full list: `data/news.jsonl`.
   - !! REAL PROBLEM FOUND AND FIXED LIVE: Node's own `fetch` was served a well-formed but EMPTY
     result by Google's edge on the exact same query `curl` answered correctly — a silent-wrong
     failure (D-85's shape), not an error. Worked around by shelling out to `curl` specifically for
     this adapter (`execFile`, never a shell string) rather than the project's normal fetch wrapper.
     ! NOT YET CONFIRMED `curl` exists on the Hetzner collection host (near-certain on any normal
     Linux box, but this project's own rule is check, don't assume — D-93's whole finding was
     exactly "the assumed-blocked thing turned out fine, and vice versa is just as possible").
   - !! ALSO FOUND: Google News indexes exchange/converter boilerplate ("Convert DOGE-1 to Yen",
     "Live Price Chart") on every query regardless of real news — filtered by title pattern in
     `newsfeed.js`, not by source (the same outlets also publish real articles).
3. NOT YET DONE — wire matches into the same evidence block D-96 puts in alerts and (once it
   exists) the admission scorer. Currently `data/news.jsonl` is a real, growing record with nowhere
   to look at it — added to Austin's queue.
4. Revisit the pump-duration measurement now that the always-on host exists — a real session of
   its own, not a line item inside this one.
5. ✓ DONE 2026-09-05, same night — Connal asked directly for GENERAL crypto news alongside the
   per-coin catalyst pillar, not instead of it. Added a second, always-on pillar to the same file:
   `collectCryptoNews()` sweeps four named crypto outlets (Cointelegraph, Decrypt, The Block,
   Bitcoin.com News — all verified live, plain `fetch` works fine for all four, no Google-News-style
   anti-bot issue) and separately checks every headline against the watchlist (whole-word match on
   `sym`/`nick`, same D-72 discipline as social ticker-matching) in case a tracked coin gets real
   crypto-media coverage. Real run: 50 headlines, 0 matched a tracked coin — an honest null result,
   not a bug; these are small memecoins and mainstream crypto press rarely covers them, which is
   itself informative. ! stored with `kind: 'catalyst'` vs `kind: 'crypto'` in `data/news.jsonl` so
   the two pillars stay distinguishable — they answer different questions and must not be merged
   into one "news score".
6. ✓ DONE 2026-09-05 — Connal asked for a way to catch "the next DOGE-1" without already knowing a
   coin's story first. Added a third pillar, `collectSelfNameNews()`: runs every watchlist coin's
   OWN NAME through the same Google News search, no curated `newsQuery` needed. Confirmed live: a
   bare `"DOGE-1"` search alone surfaces the same real rocket-mission articles the curated query
   does — so this genuinely can surface a real story before anyone has identified it.
   - !! BUT PROVEN UNSAFE TO AUTO-TRUST, SAME NIGHT, SAME METHOD: `CATE` returned real news about
     actress Cate Blanchett; `BONER` returned FDA drug-recall news and real funeral-home obituaries
     for people surnamed Boner; `microduck` returned a Hugging Face robot of the same name. All
     real articles, zero connection to the coins. Automatically treating a name-match as a real
     narrative link would be exactly the fabricated-connection the mandate bans — a coincidence
     reading as a finding. ! `confirmed: false` on every row by construction; this is a CANDIDATE
     LIST for a person to glance at, same shape as `resolve.js: identify()`'s results, never
     auto-promoted to a real connection the way market/social/wallet evidence is.
   - ! also genuinely useful, same run: `BONER` surfaced a real, relevant article ("A Memecoin
     Called BONER Has Cornered Half the Tokenized Hims & Hers Float" — The Defiant) and `CASHCAT`
     confirmed its real "Robinhood Chain" ecosystem context (already independently known from
     `[[trading-strategy/admission-backtest]]`'s SLINK/PONS finding). The mechanism works; the
     judgment of what it found still needs a person, every time.
   - ✓ FILTERED, 2026-09-05 (T-030): self-name results now require the title itself to mention
     crypto (`coin`/`crypto`/`token`/`blockchain`/`memecoin`/etc). Re-tested live against the exact
     same coins: Cate Blanchett, the funeral-home obituaries, the FDA candy recall, and the Hugging
     Face robot are ALL gone; CASHCAT's real Robinhood Chain story and BONER's real Hims & Hers
     connection both survive. ! does NOT replace the `confirmed: false` human-review step — fewer
     bad candidates reach a person, a surviving hit is still not automatically trusted.
   - ✓ CONFIRMED 2026-09-05: `curl` exists on the Hetzner collection host (`/usr/bin/curl 8.18.0`,
     checked live via SSH) — this adapter's dependency on it is no longer an unverified assumption.

## !! CONNAL ALSO ASKED FOR AN ELON/TRUMP-STYLE INFLUENCER TRACKER, 2026-09-05
Already researched in depth, not re-derived here — `[[80-WHISPERS/analysis-algorithm/README]]`
"HALF A". The short version, so it isn't lost in a whisper file:
- ! REAL-TIME monitoring of specific named accounts is a BUDGET decision, not a feature: MCII's
  social collector watches SEARCHES, not ACCOUNTS (D-67/D-81) — "tell me the moment this specific
  person posts" is a different query shape competing for the same $24/mo cap, not a free add-on.
  Truth Social specifically has no covered source at all today (twitterapi.io is X-only).
- ✓ WHAT'S ALREADY FREE, TODAY, PARTIALLY WORKING: news coverage OF a high-profile post, via the
  same Google News pillar above — confirmed live in tonight's own DOGE-1 results ("Elon Musk's
  Latest Move Could Send Dogecoin Soaring", "Elon Musk Says 'It's Time' To Put Dogecoin On The
  Moon"). This is SLOWER than watching the account directly (only catches a post once it's
  newsworthy enough for a journalist to write about) and FILTERED (routine posts never get
  covered), but it costs nothing and is already running.
- ! real direct account-watching, if wanted, needs Connal's explicit go-ahead on spend — same
  posture as D-90 (the $20→$30/mo raise was his call, stated explicitly, not assumed). Not started.
- Connal's own idea, 09-05: reuse the `fomonotifications.js` trick — read specific people's posts
  off his own Mac's notification database for free, instead of paying for a live feed, the same way
  FOMO's trade alerts already are. Checked before building: **X (Twitter) no longer has a native
  macOS app as of 2026** — the exact mechanism `fomonotifications.js` uses (reading a native app's
  local notification store by its `app_id`) has no equivalent app to read for X specifically.
  ! this does NOT close the idea, it changes what has to be tested: does a browser's own web-push
  notification for x.com (Safari/Chrome) land in the same local notification database under the
  BROWSER's `app_id`, filterable by text content? Untested, plausible, and answerable in minutes
  once Connal has notifications turned on for specific accounts — the next concrete step, not
  assumed either way.
  ! !! WIDENING THE NOTIFICATION QUERY NEEDS FRESH, EXPLICIT CONSENT, NOT ASSUMED FROM "START
  BUILDING". `fomonotifications.js`'s own header is explicit: "do not widen this query to any other
  app without asking again — that consent was for FOMO." The Full Disk Access grant is broad (it
  can see notifications from every app on the Mac), and Connal's original consent was scoped
  deliberately narrow. Checking a browser's notifications for X-shaped content means reading data
  the FOMO consent never covered. Asked directly; Connal said yes, 09-05 ("yes i grant permission").
  - ! FIRST REAL CHECK, SAME NIGHT, KEPT NARROW: queried only which browser app IDs exist in the
    notification store and how many records each has — no content read, because there was none to
    read. Safari and Chrome are BOTH registered (`com.apple.safari.webapp`,
    `com.apple.safari.webapp.<pinned-site-uuid>`, `com.google.chrome`,
    `com.google.chrome.framework.alertnotificationservice`) — the plumbing exists on this Mac.
    **All four currently have ZERO stored notification records.** Same shape as
    `fomonotifications.js`'s own finding for FOMO ("the notification database only holds what the
    OS has not yet discarded, and nothing before this feature existed was ever captured") — this
    doesn't mean the mechanism fails, it means nothing has fired through it yet to test against.
  - ∴ REAL NEXT STEP, needs a person to actually do it, not something to build blind: open x.com in
    Safari or Chrome, allow notifications when the browser prompts, turn on post notifications for
    the specific accounts (Elon, Trump), and let one real notification actually arrive. Only then
    can the decode step (same NSKeyedArchiver approach `fomonotifications.js` already proved out)
    be tested against real data — building the decoder before that exists would be guessing at a
    data shape, the same mistake this project avoids everywhere else.
  - ! Connal's own X account is suspended, so Austin is doing the follow/notification setup on his
    own account instead — sensible, sidesteps the whole question above. ! BUT THIS MOVES WHICH
    MACHINE THE MECHANISM HAS TO RUN ON: the local-notification trick only ever sees a notification
    on the Mac whose BROWSER is logged into that account and showing it — that will be AUSTIN'S
    Mac, not Connal's, once he sets this up on his own X login. ∴ this becomes an Austin-side build
    (his machine, his browser session), and it needs AUSTIN'S OWN explicit Full Disk Access consent
    on his own Mac — Connal's consent for his own machine does not transfer to Austin's. Same
    standing rule as `fomonotifications.js`'s header, applied to whoever's machine is actually
    asked. Not yet asked of Austin — flagged as a real coordination step, not assumed.

## !! ON "ANALYZE THESE NEWS POINTS FOR CONNECTIONS," 2026-09-05 — WHY THAT STAYS A HUMAN STEP
Connal asked for the news data to be ANALYZED for coin/market connections, not just shown. The
`microduck`/Hugging-Face-robot and `CATE`/Cate-Blanchett results two sections up are the direct
answer to why this can't be automated as a verdict: the exact same mechanism that correctly found
DOGE-1's real story would, with equal confidence, invent a connection between a memecoin and an
unrelated actress or robot if nothing stopped it. The mandate's core rule — never generate
plausible-sounding facts about a coin's story — applies with full force here. ∴ what's automated is
finding CANDIDATES (this file's three pillars); what stays manual is JUDGING whether a candidate is
real, the same split `resolve.js: identify()` already uses for social-discovered tickers.
- [LunarCrush — Galaxy Score methodology](https://lunarcrush.com/metrics/galaxy-score)
- [LunarCrush — Social Dominance](https://lunarcrush.com/faq/what-is-social-dominance)
- [How LunarCrush analyzes crypto social metrics (Medium)](https://medium.com/lunarcrush/how-does-lunarcrush-help-you-understand-social-metrics-in-cryptocurrency-markets-102fd9c5cb6e)
- [Santiment — combined on-chain/social/dev methodology](https://cryptoadventure.com/how-to-use-santiment-tool-to-develop-a-trading-strategy/)
- [Santiment metrics overview](https://academy.santiment.net/metrics/)
- [CryptoPanic API docs](https://cryptopanic.com/developers/api/)
- [DOGE-1 mission status — delays into 2026/2027 (KuCoin)](https://www.kucoin.com/news/flash/spacex-s-record-ipo-makes-musk-a-trillionaire-doge-s-moon-mission-delayed-to-2026)
- [DOGE-1 Solana memecoin confirmed unaffiliated, no official endorsement (Gate.com)](https://www.gate.com/news/detail/15570939)
- [Doge-1 (Wikipedia)](https://en.wikipedia.org/wiki/Doge-1)
- [doge1lunar.com — the site pairing real mission facts with the Solana contract address]
