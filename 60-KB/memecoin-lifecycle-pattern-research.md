---
id: kb.memecoin-lifecycle-pattern-research
t: kb
v: 1
upd: 2026-09-09
machine: connal
prio: high
---
# THE DEV-BUY → DEV-SELL → REAL-VOLUME → RUG SHAPE — external evidence vs our own data, tested, not assumed

Connal asked specifically for strategies that TIE what a chart shows to what actually happened
afterward, not just chart-reading — his example: an early spike from developers buying up shares,
a slight drop as they sell some off, real volume/real buyers coming in, then a rug. Tested two ways:
what the outside evidence says, and what MCII's own coin history says, across as many different
coins as the data allows, not one hand-picked example.

## DIRECT ANSWER
The general MECHANISM is real and well documented: insiders buy cheap, real buyers drive the price
up, insiders sell into that demand, the pool gets drained later. But the specific claim that the
DIP in the middle — devs selling before the real wave arrives — is its own detectable, useful stage
is NOT something the outside research has isolated or measured; it's asserted in trader blog posts,
not tested. Our own data agrees with that caution: the exact 4-stage shape is rare (2 real matches
out of 13 coins with enough history), and neither of those 2 coins rugged — if anything the opposite
of the story, though n=2 proves nothing either way. Full detail below; nothing here is a decision or
a build, per [[70-AREAS/trading-strategy/README]]'s own discipline.

## WHAT EXTERNAL RESEARCH SAYS
- fact @Kalacheva, Kuznetsov, Vodolazov, Yanovich, "Detecting Rug Pulls in Decentralized Exchanges:
  The Rise of Meme Coins" (SSRN 4981529 / ScienceDirect, 2024) — machine-learning rug detector built
  on Uniswap V2 new-token launches. Confirms rug pulls are common and learnable from on-chain
  features; does not describe or test a specific multi-stage price shape.
- fact @arXiv 2509.01168 (2025), "Detecting Rug Pulls in Decentralized Exchanges: Machine Learning
  Evidence from the TON Blockchain" — gradient-boosting classifier, catches a rug "within the first
  five minutes of trading," AUC up to 0.891 on a liquidity-withdrawal definition of rug. ! this is
  an EARLY-WARNING classifier (predict fast, from launch-moment features), a different question from
  "does a mid-pump dip mean anything" — does not confirm or test Connal's specific shape.
- fact @Solidus Labs, "Solana Rug Pulls & Pump-and-Dumps: What Crypto Institutions Must Know"
  (compliance report) — confirms the MECHANISM directly: bonding-curve pricing gives early/insider
  buyers an advantage, insiders liquidate into the rising price, the pool is later drained. Real
  numbers: **98.6% of pump.fun tokens end up under $1,000 liquidity** (effectively dead), **93% of
  ~361,000 Raydium V4 pools studied showed soft-rug characteristics**, median rug size **$2,832**,
  largest found **$1.9M**.
- est/industry, NOT peer-reviewed — bundler write-ups (Medium, solbundler.app) describe deployers
  splitting 30-40% of supply across many wallets at launch specifically to make concentrated insider
  buying look like organic distribution, then selling into the real rally once it arrives. This is
  the closest external match to Connal's exact question — but it is blog-sourced, no method, no
  sample size stated, same "vendor marketing" caution [[80-WHISPERS/whale-tracking/README]] already
  applies to unsourced "smart wallet win-rate" claims. Treat as a plausible mechanism, not a fact.
!! THE GAP: nothing found, academic or industry, isolates the MIDDLE DIP as its own measured,
useful signal separate from the accumulation and the eventual rug. Connal's 4-stage story is a
reasonable mechanical account of bonding-curve dynamics, not a validated tradeable pattern.

## WHAT OUR OWN DATA SAYS — tested, not eyeballed
Built `app/tools/backtest-lifecycle-pattern.js` this session. Four yes/no gates, straight off
Connal's own description, non-compensatory (same shape as the rug gate, never a blended score,
per D-50 / [[signal-architecture-research]]):
1. **accumulation** — an early run-up (price +20% or more) where [holders, or trading volume] grew
   much slower than price — insiders/thin buying pushing price, not a crowd.
2. **distribution** — the pullback that follows still shows flat [holders/volume] — selling into
   thin real demand, not absorbed by new buyers.
3. **recovery** — a SECOND leg up where [holders/volume AND liquidity] grew much faster than in the
   first leg — real people, real money, arriving.
4. **outcome** — does the coin later collapse (a mechanical FAIL verdict, or price/liquidity crashing
   to under 20-25% of its own peak)?

Ran two ways: (a) using HOLDER COUNT growth — the best available proxy for "real people arriving,"
on the 13 coins MCII tracks closely enough to have holder history; (b) using TRADING VOLUME +
LIQUIDITY growth — usable on more coins — on both those 13 and the 104 broader scanner-survivor
coins from `candidates.jsonl` (a much wider mix: pumped-and-abandoned ones, small runners, the
long-tracked ones, not just hand-picked holds).

**Result (a), holder-based, n=13 tracked coins:** the full 4-stage shape showed up in exactly
**2 coins — DOGE-1 and OTC.** Neither rugged; both are still-tracked, still-liquid, and DOGE-1 is
the one this project independently rated "real-looking-growth" weeks earlier
([[trend-growth-analysis]]). Of the coins that DID mechanically rug or FAIL (ANSEM, GPRO — a third,
ZCAT, is a bad price-quote artifact, see bug note below), NONE showed the full 4-stage shape.
On this reading, the exact pattern Connal described did NOT predict a rug in our own history — if
anything the opposite — but n=2 is nowhere near enough to call that a real finding either way.
Marginal (partial) signals, for the record: accumulation alone fired on 5 coins (40% later rugged),
distribution alone on 6 (33% later rugged), recovery alone on 2 clean coins after excluding ZCAT
(0% rugged, both DOGE-1/OTC again).

**Result (b), volume/liquidity-based, n=117 (13 + 104 coins):** the pattern could not be tested at
all — zero matches, on either file. Checked why rather than assumed: MCII's volume field is a
rolling 24-HOUR total refreshed on a 30-minute-to-2-hour scan cycle, so it barely moves
reading-to-reading. Same granularity wall `marketmanip.js`'s own volume-spike detector already hit
and documented in [[market-manipulation-research]]. This is NOT a null result about the pattern —
it is a "cannot be measured at our current data resolution" result.

**A real bug found while building this.** ZCAT's price history contains one impossible reading
($287.50, implying $4.4B of liquidity) that survived the existing bad-quote filter
(`app/shared/pricesanity.js`, built for T-037) because that filter only rejects a price spike when
liquidity did NOT move with it — this one bad quote happened to carry an equally bad liquidity
figure, so it read as "corroborated." Same family as T-037/D-117, on a path their fix didn't cover.
ZCAT excluded from every result above; the filter gap itself is unfixed and worth a look on its own.

## CAVEATS, PLAINLY
- n=2 for the only comparison that actually ran is a data point, not a result. Both directions
  (pattern-precedes-safety, pattern-means-nothing) stay live until n is much bigger.
- **Survivorship bias**, same shape flagged elsewhere in this vault: the 13 `market.jsonl` coins are
  ones MCII chose to keep tracking — a coin that hard-rugged early would likely have been dropped
  before racking up 6+ readings, so this sample structurally under-represents fast, early rugs. The
  104-coin `candidates.jsonl` sample is less curated (scanner survivors, not hand-picked holds) and
  its ~22% hard-collapse rate is a more honest general base rate — but it can't run the holders test
  at all (holders present on only 0.6% of its rows).
- The literature's 93–98.6% "almost everything dies" figures describe the WHOLE population of
  tokens ever launched on these platforms, including ones that never draw a first real buyer. MCII's
  samples are already post-safety-filter, already-scanned survivors — a narrower, pre-selected
  group. The two kinds of numbers are not measuring the same population and should never be quoted
  side by side as if they were.
- Trial count for this research: **1** threshold set tested per proxy (2 proxies: holders,
  volume/liquidity). Not tuned after seeing results. Any later threshold change is trial #2 and must
  be logged as such (Deflated-Sharpe discipline, [[signal-architecture-research]]).

## FALSIFIER
If, once holder-history coverage grows past today's 13 coins (or finer-than-24h volume becomes
available), a real sample of 30+ full-4-stage matches shows a rug rate NOT meaningfully lower than
the base rate, today's read (pattern doesn't predict a rug, if anything the opposite) still holds.
If it shows a rug rate meaningfully HIGHER, that reverses today's read and should be believed
instead, not defended against.

## WHAT WOULD ACTUALLY MOVE THIS FORWARD
1. more holder-history coverage — bottlenecked today by which coins MCII happens to track closely.
2. finer-than-24h-rolling volume, if it's ever collected — would unlock the volume proxy on the
   full candidate universe instead of zero coins.
3. re-run this exact script, UNCHANGED thresholds, once n grows — not re-tuned on this same sample.
4. NOT recommended yet: wiring this into `rescore.js`/`admission.js`. n=2 is not a foundation for a
   real gate, per D-05 (n>=50 before anything is trusted for a decision).

## Sources
- Kalacheva, Kuznetsov, Vodolazov, Yanovich. Detecting Rug Pulls in Decentralized Exchanges: The
  Rise of Meme Coins. SSRN 4981529 / ScienceDirect, 2024. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4981529
- Detecting Rug Pulls in Decentralized Exchanges: Machine Learning Evidence from the TON Blockchain.
  arXiv 2509.01168, 2025. https://arxiv.org/abs/2509.01168
- Solidus Labs. Solana Rug Pulls & Pump-and-Dumps: What Crypto Institutions Must Know.
  https://www.soliduslabs.com/reports/solana-rug-pulls-pump-dumps-crypto-compliance
- crypto.news. How meme coins are made: bonding curves, Pump.fun, and the math behind rug pulls.
  https://crypto.news/how-meme-coins-are-made-bonding-curves-pump-fun-rug-pulls/
- (industry write-up, unsourced — folklore not fact) solbundler.app / Medium bundler explainers on
  insider wallet-splitting to disguise concentration as organic distribution.
