---
id: kb.market-manipulation-research
t: kb
v: 2
upd: 2026-09-05
machine: connal
prio: max
---
# MARKET-SIDE MANIPULATION — the wash-filter rework, researched properly

!! Connal, 2026-09-05, on the wash-trade filter: "We may need to rework that system to try and
figure out a better filter." Done as real research, not guesswork. `app/shared/marketmanip.js` is
the result — it complements `washtrade.js` (per-wallet, needs RPC calls) by working purely on the
price/volume/liquidity/holder snapshots already collected every cycle, so it costs nothing and can
be run retroactively over the whole history.

## !! THE NUMBER THAT SHOULD CHANGE HOW EVERY WIN RATE IN THIS PROJECT IS READ
fact @Mongardini & Mei, *A Midsummer Meme's Dream: Investigating Market Manipulations in the Meme
Coin Ecosystem* (arXiv 2507.01963) — 34,988 tokens, Ethereum/BNB/Solana/Base, three months:
**82.8% of high-return meme coins (>100% gains) showed evidence of artificial growth strategies.**
17,000+ victimised addresses, $9.3M realised losses documented.
- ! this project's tooling SELECTS FOR LARGE GAINS at every stage — the trend-candidate list ranks
  by price move, `derive-wallets` looked for "notable movers", and `[[emerging-signal-backtest]]`'s
  62% hit rate counts +20% target hits as wins. ∴ they all sample the exact population where
  roughly four in five are manipulated. That is not a caveat to file away; it is the most important
  context for reading any of tonight's win rates, and it was not known when the 62% was written up.
- Named manipulation types worth knowing apart: wash trading; **liquidity-pool price inflation
  (LPI)** — "small strategic purchases trigger dramatic price increases" in a thin pool; pump and
  dumps; rug pulls.

## WHAT THE DETECTION LITERATURE ACTUALLY RECOMMENDS
- fact: **volume/price divergence** — volume up >500% with price moving <5% is the classic
  wash-trade tell (natural markets move price when real volume arrives).
- fact: **circular trading** — sets of accounts repeatedly trading among themselves with matching
  volumes and no net position change. ! `washtrade.js` today catches self-trades (one wallet both
  sides) and shared-funding clusters, NOT a 3+ wallet ring — a real remaining gap.
- fact: **backward funding search** — multiple wallets funded from one source in a short window.
  ✓ already implemented in `washtrade.js`, bounded to a 20-signature lookback.
- fact: **statistical tells** — first-significant-digit (Benford) distributions, size rounding,
  transaction tail distributions. Needs per-trade data at volume; not attempted.

## !! WHAT HAPPENED WHEN THOSE WERE ACTUALLY RUN HERE — a real negative result, then a fix
Implemented the two headline detectors (volume-without-price, price-without-volume) and ran them
over every coin in this project's history: **3 of 128 coins flagged, ~2%** — and the single flagged
"winner" was STONK, whose flag was our own known price bug (T-037), not manipulation.
- ∴ root cause, found by running rather than assuming: **those thresholds are written for per-TRADE
  data, and this project has 30-minute snapshots of 24-HOUR rolling aggregates.** A 24h volume
  figure barely moves between two consecutive readings, so "volume 5x its previous reading"
  essentially cannot fire. The detectors are not wrong; they are unmeasurable at this granularity.
- ✓ THE FIX, grounded in this project's own measurement rather than borrowed: **price rising while
  HOLDER COUNT does not.** `[[trend-growth-analysis]]` (measured earlier the same night) already
  found CATE and DOGE-1 rise WITH holders (r=+0.22/+0.26) while LaPeace rose AGAINST them
  (r=−0.45). Real adoption adds holders; a pushed price does not. Same "artificial growth" idea as
  the paper, expressed in the one field this project measures reliably every cycle.

## THE RESULT OF THE DETECTOR THAT ACTUALLY FITS OUR DATA
Only 27 of 128 coins carry holder data at all (holder counts come from a Solana-only source —
`70-AREAS/multichain-market-data/README`), so coverage is the binding limit, not the rule. Of those:
- **LaPeace** — flagged (+30% price, −0.4% holders). Independently the same coin
  `[[trend-growth-analysis]]` singled out, and the one Connal later removed from his watchlist.
  Two separate methods agreeing on the same coin is real corroboration, not one metric repeating.
- **`cat` — flagged, and it is one of the 13 "wins" behind tonight's 62% hit rate**: +82% price
  while holders fell 7.3%. ∴ at least one of that backtest's wins looks like an artificial pump
  rather than a real move — exactly what the 82.8% base rate above predicts, found in our own data.
  `[[emerging-signal-backtest]]`'s number should be read with that in mind.

## !! WHAT "FAKE PUMP" ACTUALLY MEANS — and the measurement that separates it, on our own data
Connal asked directly: how is a pump fake or artificial, and shouldn't the answer be a better
wash-trade filter? Both halves answered with real numbers rather than argument.

**The price move is completely real.** Nothing about "artificial" means the chart is fabricated —
you could genuinely sell into it. What is manufactured is the APPEARANCE OF DEMAND behind it. Four
mechanisms, from the literature, all producing the same-looking green candle:
1. **Wash trading** — one person trading with themselves across wallets. Real volume on the chart,
   zero net buying. Buys a place on "trending" lists, which attracts real money.
2. **Liquidity-pool price inflation** — the pool is thin, so a small buy moves price enormously.
   $2k into a $30k pool can print a 40% candle. The chart looks like a rocket; the money is
   trivial. Whoever pushed it sells into whoever the chart attracts.
3. **Insider/sniper concentration** — a few wallets (often the creator's) hold most of the supply
   from launch; the "pump" is them marking up their own bag.
4. **Coordinated pump and dump** — a group buys together, hypes, and sells into the crowd.
∴ the common thread is not the volume or the candle — it is that **the move is engineered to end
with someone else holding it.** You can still make money on a fake pump if you are early and exit
fast; you are just playing against people who know when the exit is and you don't.

**∴ improving the wash-trade filter is NOT the highest-leverage fix, and the data says so.** Wash
trading is one of four mechanisms, `washtrade.js` costs an RPC call per wallet, and it is
Solana-only. The far cheaper read catches the OUTCOME of all four at once, from fields already
collected every cycle: **who ends up holding the coin.** `marketmanip.js: growthQuality()`, run over
every coin with holder history:

| shape | coins | reading |
|---|---|---|
| real-looking growth | **1 of 17** — DOGE-1 (price +117%, holders +18%, top1 −1.6pts) | more people arriving, biggest wallet's grip loosening |
| price up, nobody arriving | `fone` (+341% price, holders −1%), `cat` (+43%, holders −7%) | the artificial-growth shape, exactly |
| crowd leaving, whale staying | 9 coins incl. CATE, LaPeace, ANSEM, NEEGY (−97% holders), CYBERLEEK (−91%) | people exiting while the top wallet's share grows |
| mixed / flat | 5 | nothing conclusive |

- !! **only ONE of seventeen coins this project has holder history for shows genuine growth.** That
  is a base rate about this project's own watchlist, measured, not borrowed from a paper.
- !! **`fone` gained 341% while its holder count FELL.** Both `fone` and `cat` were counted as
  "wins" in `[[emerging-signal-backtest]]`'s 62%. Two of those 13 wins now look manufactured.
- ! LaPeace is the shape at its clearest (holders −6%, top1 +3.7 points) and is the coin Connal
  independently removed from his watchlist — three separate methods agreeing on one coin.

## WHAT'S STILL NOT DETECTED — stated so it isn't mistaken for covered
- Circular/ring trading across 3+ wallets (`washtrade.js` sees pairs and funding clusters only).
- Anything needing per-trade granularity: Benford tests, size-rounding, tail distributions.
- Holder-based detection on any non-Solana chain — no holder data exists there at all.

## SOURCES
- [Mongardini & Mei, A Midsummer Meme's Dream (arXiv 2507.01963)](https://arxiv.org/abs/2507.01963)
- [Victor & Weintraud, Detecting and Quantifying Wash Trading on DEXes (arXiv 2102.07001)](https://arxiv.org/pdf/2102.07001)
- [Crypto Wash Trading (arXiv 2108.10984)](https://arxiv.org/pdf/2108.10984)
- [Detecting Crypto Wash-Trading Patterns Using On-Chain Signals (FinanceFeeds)](https://financefeeds.com/detecting-crypto-wash-trading-patterns-using-on-chain-signals-a-guide-for-traders/)
