---
id: kb.dip-buy-exit-tier-research
t: kb
v: 1
upd: 2026-09-10
machine: connal
prio: high
---
# WHEN TO BUY A DIP, HOW WIDE, WHEN TO GET OUT — split by market cap AND coin age, external evidence

Connal asked directly for real trading-strategy research: how big a dip to look for before buying,
when to actually get out, and to do this across different market-cap tiers and coin ages rather
than one flat rule. This does not reopen D-134 (Claude scores, never names a coin to buy) — nothing
here is coin-specific; it is the general framework the [[trading-strategy/README|README]]'s
financial-plan section already said it needed, now checked against outside evidence instead of
reasoned from first principles alone.

## DIRECT ANSWER
There is no single "% dip" number that transfers across tiers, and outside evidence only exists for
the tiers on the large end. Below roughly a few months old / meaningful liquidity, published
backtests essentially stop existing — MCII would be extrapolating, not applying tested research, if
it used a BTC-derived number on a pump.fun coin. The one thing that DOES transfer cleanly across
every tier is sizing the stop/target to the coin's OWN recent volatility (ATR) rather than a flat %,
which is already this vault's recommended default — this research adds real backtest numbers behind
that recommendation rather than changing it.

## TIER 1 — brand-new micro-cap, under ~24h old, not yet "graduated" (most of pump.fun)

fact @[CoinGecko, pump.fun lifespan study](https://www.coingecko.com/research/publications/average-lifespan-of-pumpfun-tokens) +
[SSRN Kamat 2026, 832,941-token survival analysis](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6915560):
68.67% of every token ever launched on pump.fun recorded its LAST trade the same calendar day it was
created. Only 4.55% survive past 90 days. The pooled graduation rate (reaching a real liquid market)
is ~0.2%, and the survival curve falls hardest in the first six hours.

∴ est, conf 75%: at this tier, "buy the dip" and "watch it die" are not reliably distinguishable from
price alone in real time. The base rate of total failure this early is so high that a price drop
needs corroborating evidence (liquidity holding, holder count not collapsing) before it means
anything — which is closer to MCII's existing structural gates than to a % pullback rule.
falsifier: a labelled record (once n≥50 exists, D-05) showing dips-that-recover at this age are
common and identifiable by a specific signal would overturn this.

No credible published "buy this % dip" rule exists for sub-day-old coins. Classic technical
indicators (RSI, moving averages) need enough price history to compute one — a coin an hour old
doesn't have it. Anything claiming a specific dip-% for this tier online is trader folklore
(`vibe`), not a cited backtest, and should be treated that way if it comes up again.

## TIER 2 — days-to-weeks-old survivors (most of MCII's actual watchlist)

est: having survived pump.fun's worst mortality window is itself informative (it's a form of
survivorship), but this vault's OWN test found nothing to hang a rule on yet —
[[memecoin-lifecycle-pattern-research]] could not confirm any specific chart shape (dev-buy →
dev-sell dip → real-volume re-pump) predicts an outcome; n=2 matches, neither rugged, explicitly
flagged as too small to trust either way.

fact (already in this vault, arXiv 2507.01963): 82.8% of >100% gainers in this population are
artificial. ∴ a dip-then-recovery at this tier is more likely to be manufactured than organic — this
is exactly why `rescore.js`'s entry rule already gates on "not a known-manufactured shape" rather
than reading a dip as a buy signal by itself. This research did not find anything that weakens that
design; if anything it reinforces it.

Fixed-%-dip rules ("buy every 20% drop") have no citable backing at this tier specifically — every
%-based number in this document below comes from BTC/ETH/large-cap studies and does not transfer
without evidence that this population behaves the same way (it likely doesn't: liquidity depth alone
makes a 20% move mean something completely different on a $50k-liquidity coin vs. a $500M one).

The one thing that DOES transfer: ATR-style sizing (stop/target scaled to the coin's own recent
swings, not a flat %) needs no story about WHY price moved — see the cross-tier section below.

## TIER 3 — mid-cap alts (established months+, real liquidity and chart history)

fact @[Kaiko/CoinDesk 80 coverage, 2024-2025]: mid/small-cap altcoin BASKETS saw peak-to-trough moves
of -30% to -46% even while BTC stayed comparatively stable (Kaiko: small-caps -30%+ in 2024; CoinDesk
80: -46% in Q1 2025; small-cap indices revisited 2020 lows by late 2025). Individual coins inside
those baskets move harder than the basket average — a basket smooths out single-coin swings.

fact, contested — RSI(14) oversold(<30)/overbought(>70) on BTC:
[one 2018-2026 backtest](https://www.quantifiedstrategies.com/rsi-trading-strategy/) found a 66.7%
win rate but a 65.61% MAX DRAWDOWN — meaning it wins most trades but the losses when it's wrong are
severe; a high win rate here does not mean low risk. A different window
([2015-2021](https://www.quantifiedstrategies.com/bitcoin-rsi-trading-strategy/)) found a 57.69% win
rate, 1.95 profit factor. A third source states plainly that RSI mean-reversion "doesn't work on
Bitcoin" at all. These three do not agree — this is genuinely unsettled evidence, not a fact MCII
can build on, and it is a large-cap (BTC) number regardless; no dedicated mid-cap-alt RSI study was
found, so extrapolating this to an alt would be an unlabelled `est`, not a fact.

## TIER 4 — large-cap (BTC/ETH/SOL)

fact @[BTC drawdown history](https://patentpc.com/blog/bitcoin-price-movements-volatility-peaks-correction-stats):
since 2014, BTC has had 4 drawdowns over 50%, the 3 largest averaging ~80%; 5 times BTC has fallen
77%+ and recovered to new highs; in 3 of those 4 major corrections, recovery took ~3 years. BTC's
average annual drawdown this decade is ~41% — a 40% dip in BTC is a NORMAL year, not a rare crash.

fact, current cycle (2026): ETH has drawn down ~60% vs BTC's ~48% — ETH is currently the MORE
volatile of the two "large caps" right now; that label isn't fixed to one coin permanently.

est, conf 55%: within a bull run, the first significant correction has historically run 15-30%,
arriving roughly six to seven weeks into a new price-discovery phase — a pattern across a handful of
past cycles, not a law; sample size is small enough (a few cycles) that this is a soft prior, not a
rule to act on alone.

fact @[ATR stop-loss backtest, quant-signals.com]: BTC and ETH run daily ATR (average true range —
plain terms: how much the price typically moves in a day) of 3-8% during active periods. A 2.0x ATR
multiplier for the stop was the best-performing width tested across assets (avg profit factor 1.16
vs 1.08 at 1.5x and 1.01 at 3.0x); one specific BTC backtest using 2x ATR got a 1.72 profit factor
with only 4.6% max drawdown. This is a single study's number, not a guarantee, but it is the
best-evidenced rule found anywhere in this research, and it's already this vault's recommended
default (README, "stop/target width should scale to each coin's own normal swings").

## EXITS — cross-tier, not tier-specific

- **Triple-barrier (target / stop / time-limit)** — already the adopted framework here (López de
  Prado); nothing in this research changes that recommendation. It's still the best-documented way
  to close a position by rule instead of by feel.
- **Trailing stop** (a stop that only ever moves up as price rises, never down) is the standard
  answer to "when do I get out of a winner that's still running" — it protects gains without capping
  the upside the way a fixed take-profit does. No memecoin-tier backtest was found for this
  specifically; the concept itself is standard finance, not new research, so it's not being claimed
  as tested for MCII's population.
- **Time-limit exits matter most at Tier 1** — given 68.67% die same-day, a Tier-1 position with a
  price stop but no time limit is unhedged against the coin simply going to zero liquidity rather
  than a tradeable price move.

## THE HONEST GAP

No research — published, or anywhere in this vault — answers "how big a dip should I buy" as one
number for pump.fun-era micro-caps (Tiers 1-2, which is most of what MCII actually tracks). Every
credible %-based figure in this document comes from BTC/ETH or altcoin-basket studies (Tiers 3-4).
Applying a large-cap dip-% rule to a coin that's six hours old is exactly the kind of unjustified
transfer the mandate exists to catch, not smooth over — if this comes up again, the honest answer at
Tiers 1-2 is still "we don't know yet, and neither does anyone with a citable backtest."

## WHAT WOULD CHANGE THIS
A labelled outcome record (D-05, n≥50) built from MCII's own tracked coins at Tiers 1-2, showing a
specific dip depth or shape that actually precedes recovery more often than chance. Until then, the
ATR-based stop/target sizing is the one piece of this research safe to lean on at every tier, because
it doesn't require knowing WHY the price moved — only how much it normally does.

## SOURCES
- [CoinGecko — Average Lifespan of Pump.fun Memecoins](https://www.coingecko.com/research/publications/average-lifespan-of-pumpfun-tokens)
- [SSRN — Kamat, Pump.fun Graduation Regime Windows: Survival Analysis of 832,941 Token Launches](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6915560)
- [PatentPC — Bitcoin Price Movements: Volatility, Peaks & Correction Stats](https://patentpc.com/blog/bitcoin-price-movements-volatility-peaks-correction-stats)
- [Investing.com — Ethereum's 60% Drawdown vs Bitcoin, 2026](https://www.investing.com/analysis/ethereums-60-drawdown-shows-why-it-is-lagging-bitcoin-in-2026-200682271)
- [Kaiko / KuCoin coverage — Small-cap crypto volatility rises amid Bitcoin stability](https://www.kucoin.com/news/flash/small-cap-crypto-volatility-rises-amid-bitcoin-stability)
- [Quant Signals — ATR Stop Loss Strategy: Optimal Multipliers Tested Across 6 Assets](https://quant-signals.com/atr-stop-loss-take-profit/)
- [QuantifiedStrategies — RSI Trading Strategy (Bitcoin, 2018-2026 backtest)](https://www.quantifiedstrategies.com/rsi-trading-strategy/)
- [QuantifiedStrategies — Bitcoin RSI Trading Strategy (2015-2021 backtest)](https://www.quantifiedstrategies.com/bitcoin-rsi-trading-strategy/)
- arXiv 2507.01963 (already cited elsewhere in this vault, re-used not re-fetched)

## RESEARCH RECORD
Web search only, 2026-09-10, five targeted queries (pump.fun survival by age, BTC/ETH drawdown
history, altcoin-basket volatility vs large-cap, ATR stop-loss backtests, RSI oversold backtests).
No paywalled sources fetched in full; figures taken from search-result summaries of the cited pages,
not independently re-derived — treat the exact decimal figures (e.g. "65.61% max drawdown") as
reported-by-source, not re-verified by MCII. Stopped after five queries because further searches
were returning the same handful of studies restated, not new ones — the Tier 1-2 gap is real, not a
search-effort artefact; there just isn't published research on pump.fun-era dip-buying yet.
