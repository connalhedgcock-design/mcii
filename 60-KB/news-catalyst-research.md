---
id: kb.news-catalyst-research
t: kb
v: 1
upd: 2026-09-04
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
1. Add `newsQuery` as an optional field on `data/watchlist.json` entries — same manual-curation
   shape already used for coins and wallets, cheapest possible step.
2. A small adapter reading Google News RSS per coin with a query set, on the collector's existing
   cadence — no new infrastructure, extends the pattern `walletflow.js`/`fomonotifications.js`
   already established this week.
3. Wire matches into the SAME evidence block D-96 already puts in alerts and (once it exists) the
   admission scorer — a fourth sensor alongside market/social/FOMO, gated the same way: a hit is
   evidence to show, never a standalone reason to admit or alert on its own.
4. Revisit the pump-duration measurement now that the always-on host exists — a real session of
   its own, not a line item inside this one.

## SOURCES
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
