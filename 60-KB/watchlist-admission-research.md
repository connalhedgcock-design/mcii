---
id: kb.watchlist-admission
t: kb
v: 1
upd: 2026-09-01
machine: connal
prio: high
---
# WHICH COINS TO TRACK — how to decide, researched
!! written 2026-09-01 on Connal's instruction ("do research on things you find in the files like
for example what a good way to decide for you which coins to be tracking"). Third in the series
with [[social-signal-research]] (what to pull from a post) and [[signal-architecture-research]]
(how to arrange the scoring). This one answers: of everything discovery surfaces, what earns a slot.

## !! FIRST — THE CONSTRAINT CHANGED TODAY, AND THE VAULT IS STALE ON IT
Every earlier decision about the watchlist priced a coin in DOLLARS:
- D-65: "each coin costs ~$4.32/mo in social collection. a 3rd coin breaks the $12 cap."
- D-68: "leftover budget is a pot DIVIDED across the watchlist. adding a coin costs depth."
- D-64: "per-coin social collection outranks the sector read for budget."
∴ ! ALL THREE ARE NOW OBSOLETE. Per-coin social searches were turned OFF today (D-108). What a
tracked coin costs now:
- fact: **$0 in X spend.** Social for a tracked coin is a filter over the sweep we already bought.
- fact: market/safety/exit/holder passes are DexScreener, RugCheck, Jupiter and a public RPC —
  all free tiers, no per-call charge.
- fact: the real costs are **collector runtime** (measured 35–38s per run against a 30-minute
  window — enormous headroom), **free-tier rate limits**, and **screen attention**.
∴ !! the question is no longer "can we afford another coin". It is "does another coin make the
screen better or worse", which is a completely different question and has a different answer.
! `est:` conf 85%. falsifier: if runtime scales worse than linearly (batched calls degrading, RPC
throttling) then slots become scarce again and the dollar-era framing partly returns. Measure
runtime against coin count before adding many.

## THE PROBLEM, NAMED PROPERLY
Discovery already produces candidates continuously — `unknownTickers()` surfaced ~180 unknown
tickers in one measured sweep, and `identify()` resolves the qualifying ones to a real address.
Today those land in the sector row and **nothing happens to them** (`cloud-collect.js:449` —
`identified` is written to the record and never reaches the watchlist; verified in code 09-01, not
assumed from notes). So the open question is an ADMISSION problem: a stream of candidates, a list
that must stay small enough to read, and a need to drop things that stop deserving a place.
! this is not a prediction problem and must not be dressed as one. Nothing here claims a tracked
coin will do well.

## TIER 1 — THE ADMISSION RULE. Take it from cache design, not from finance.
- fact @Einziger, Friedman & Manes, *TinyLFU: A Highly Efficient Cache Admission Policy* (ACM
  ToS 13(4); arXiv 1512.00727): given a new item and an eviction candidate already in the cache,
  TinyLFU decides **whether the newcomer is worth admitting at the expense of that victim**,
  using a compact approximate frequency sketch rather than full history.
- fact @W-TinyLFU: all new items enter a small **window** (~1% of capacity) first; on eviction from
  the window they are considered for promotion to the main store, and admitted only if they beat
  the weakest incumbent. Reported to match or beat other state-of-the-art policies across traces.
- ∴ ✓ **ADOPT THE SHAPE.** Admission is COMPETITIVE, never a threshold. "Three credible people
  named it" should not admit a coin outright; it should enter it into a contest with the weakest
  thing currently tracked. Two properties this buys, both of which the current design lacks:
  1. the list **cannot bloat** — admitting always costs a seat, so growth is self-limiting.
  2. **seniority stops protecting incumbents.** A coin tracked three weeks ago that nobody has
     mentioned since is exactly the seat a live candidate should be able to take.
- ! `est:` conf 80% this is the right frame. falsifier: if slots genuinely are free (runtime stays
  flat to 50+ coins) then competitive admission is unnecessary ceremony and a plain threshold with
  an expiry is enough. ! MEASURE RUNTIME FIRST — this is cheap to check and I have not checked it
  past 5 coins.

## TIER 2 — HOW MUCH ATTENTION EACH CANDIDATE GETS. Fixed-budget best-arm identification.
- fact @Karnin, Koren & Somekh (ICML 2013) / successive-halving literature: in the FIXED-BUDGET
  setting you allocate observation uniformly across arms, evaluate, promote the best 1/η (η
  typically 2 or 3), **prune the rest**, and repeat — so exponentially more budget reaches the
  survivors. Successive Rejects is the same family.
- ∴ ✓ candidates should be observed in ROUNDS with elimination, not watched indefinitely at equal
  depth. A ticker three people named gets a cheap first look; only the ones still interesting after
  round one earn a chart, holder history, or a safety check.
- ✓ this is D-32's funnel ("bulk-cheap > safety > expensive-per-token") already, extended from one
  pass to repeated rounds. The project's instinct was right; the literature adds the elimination
  schedule and the early-stopping criterion.
- ! the honest limit: BAI assumes arms are stationary and rewards are drawn from fixed
  distributions. A memecoin is emphatically not stationary. ∴ borrow the ELIMINATION SCHEDULE, do
  not import the optimality guarantees. `est:` conf 60%.

## TIER 3 — WHEN TO DROP. Set the clock from the survival base rate, not from feel.
- fact @chainplay/pump.fun analysis: average memecoin lifespan **~12 days**; **~15% die within 24
  hours**, **~31% within a week**. ! vendor-analysed on-chain data, not peer-reviewed — treat the
  shape as solid and the decimals as soft.
- fact @[[base-rates]] (already in this vault): ~97% of memecoins since Jan-2024 have died or lost
  essentially all volume; pump.fun graduation ~0.26%.
- fact @arXiv 2206.08202 (Ethereum/BSC token ecosystem): "one-day" tokens — all transactional
  activity gone within 24h of deployment — are a large, distinct population.
- ∴ ✓ **TRACKING MUST EXPIRE BY DEFAULT.** A coin should hold its slot only while it keeps earning
  it; the default at the end of a window is DROP, not keep. With a third dying inside a week, a
  list that only ever grows is mostly a list of dead things.
- ✓ a probation window of ~72h fits the hazard shape: long enough to survive the one-day die-off,
  short enough that a slot turns over while the information is still worth having.

## ∴ THE DESIGN I RECOMMEND — three tiers, one hard line
1. **CANDIDATES** — everything `unknownTickers()` surfaces at ≥3 WEIGHTED people (D-100). Free:
   they are already in the sweep we bought. Recorded, ranked, never charted. No cost, no limit.
2. **PROBATION** — a fixed number of seats (start at 10; it is a runtime budget, not a money one).
   A candidate takes a seat only by beating the weakest occupant, and only after clearing the
   safety gate. Auto-drops after ~72h unless it re-qualified inside the window. Full market,
   safety, holder and chart history while it holds the seat — which is precisely the record needed
   to answer this vault's oldest open question ("does rising attention precede price moves for
   coins this small"). ! today that question is unanswerable because we never track the coins the
   signal fires on.
3. **THEIRS** — the coins Connal and Austin actually put money in. ! **NEVER auto-admitted, NEVER
   auto-evicted, never competing for a probation seat.** D-70: bad news about a held coin outranks
   everything. A policy that could quietly stop watching a coin someone holds is not acceptable at
   any hit-rate.

## ! WHAT THIS DOES NOT DO — read before anyone calls it a strategy
- it decides what to WATCH, never what to buy. No admission rule here is an entry signal, and
  promoting a coin to probation must never render as a recommendation on screen.
- `?` the social-collection README's own open question stands: **nobody has shown `emerging`
  predicts anything.** This design does not answer that — it BUILDS THE RECORD that could. That is
  the honest case for it, and the only one I would make.
- ! it will admit coins that go to zero. Given the base rates above, most of them will. The measure
  of success is whether the tracked set is a better sample than what `screener.js` surfaces today
  (newest listings, PAID listings, trending-by-volume — all either too-new or already-moved), not
  whether the coins go up.
- ! `est:` conf 55% only that this beats the current discovery sources on that measure. It is a
  testable claim and should be logged as a forecast in [[50-LOG]] before it is built, not after.

## SOURCES
- [TinyLFU: A Highly Efficient Cache Admission Policy (arXiv 1512.00727)](https://arxiv.org/abs/1512.00727)
- [TinyLFU (ACM Transactions on Storage 13:4)](https://dl.acm.org/doi/10.1145/3149371)
- [W-TinyLFU admission + eviction design (CacheKit docs)](https://oxidizelabs.github.io/cachekit/policies/roadmap/tinylfu.html)
- [Almost Optimal Exploration in Multi-Armed Bandits — Karnin, Koren & Somekh (ICML 2013)](https://proceedings.mlr.press/v28/karnin13.pdf)
- [On Sequential Elimination Algorithms for Best-Arm Identification (arXiv 1609.02606)](https://ar5iv.labs.arxiv.org/html/1609.02606)
- [Fixed-Budget Best-Arm Identification in Structured Bandits (IJCAI 2022)](https://www.ijcai.org/proceedings/2022/0388.pdf)
- [Lifespan of pump.fun memecoins (ChainPlay)](https://chainplay.gg/blog/lifespan-pump-fun-memecoins-analysis/)
- [Token Spammers, Rug Pulls and SniperBots (arXiv 2206.08202)](https://arxiv.org/pdf/2206.08202)
- [Measuring Memecoin Fragility (arXiv 2512.00377)](https://arxiv.org/html/2512.00377v1)
