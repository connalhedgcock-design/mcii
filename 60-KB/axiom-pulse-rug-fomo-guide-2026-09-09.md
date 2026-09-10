---
id: kb.axiom-pulse-rug-fomo-guide
t: kb
v: 1
upd: 2026-09-09
machine: connal
prio: high
---
# AXIOM PULSE FILTERS + RUG AVOIDANCE + FOMO-COIN SELECTION — researched 2026-09-09

Connal asked for a "what to look for" guide, combining what top traders actually recommend with
what real research papers found, stating both cases and merging where they agree. Full search
trail and sources at the bottom. Two readings of "coins to trade on FOMO" exist — this covers the
general one (chasing hype/momentum coins) since that's what all sources answer; if he meant his
FOMO app specifically (the one giving him phone alerts from 60 followed traders), that's a
different, still-open question — see [[trading-strategy/README]] D-125.

## 0. WHAT MCII ALREADY CHECKS FOR YOU — don't duplicate it by hand
`app/shared/safety.js` (`evaluateSafety`) already runs on every coin MCII tracks:
- mint authority open, freeze authority open, metadata mutable → CRITICAL, instant FAIL
- top-1 holder >15% → HIGH warning, >8% → MED
- top-10 holders >40% → HIGH
- insider wallets flagged by RugCheck → HIGH
- liquidity <$30,000 → HIGH ("hard to get out")
- pool <3 days old → MED ("no track record yet")
- <200 holders → MED
This is stricter on top-10 concentration than most trader guides below (40% vs their 30%) and does
NOT currently check dev-wallet-% specifically, sniper-%, or bundle-% as separate numbers — RugCheck's
generic risk list covers some of this but not with Axiom's specific field names. So: for anything
MCII already tracks, trust the app's PASS/CAUTION/FAIL, don't re-eyeball it on Axiom. The Axiom-specific
filters below matter for coins you're looking at BEFORE they're on MCII's watchlist — i.e. hunting on
Pulse itself.

## 1. AXIOM PULSE FILTERS

**What Pulse is:** a live feed of new Solana tokens, split into three columns by lifecycle stage —
New Pairs (still on the bonding curve, minutes old), Final Stretch (close to graduating), Migrated
(already on a real market via Raydium). Fourteen filter fields exist; nobody sets all fourteen every
time — traders save one filter preset per "hunt type" (brand-new vs. already-proven).

**The trader case** (Axiompedia, memecoinnavigator.com, solanasniperbot.net — practitioner guides,
not audited, treat as est not fact):
| Filter | What it means | Recommended for hunting NEW pairs |
|---|---|---|
| Snipers % | share bought by bots in the first seconds | max 10% |
| Dev holding % | share the creator wallet still holds | max 10% is the common number; max 5% for a tighter/beginner-safe setting. One skeptical guide (Boxmining) pushes back hard: this number can be WRONG, not just risky — a dev can split their holding across wallets Axiom hasn't tagged as "dev," so a clean reading here is not proof, only a first pass |
| Insiders % | share held by wallets linked to private sale / team / early privileged allocation | no official Axiom number found anywhere; trader convention says risk rises noticeably above 10-20%. Weaker signal than dev holding — some experienced traders leave this filter blank because it's the hardest of the group to detect reliably |
| Volume | total traded so far | $500+ (proves *something* is happening) |
| Market cap | price × supply | $5,000+ as a floor, adjust to what's "normal" that day |
| At least one social link | X/Telegram/website present | ON — no socials at all is close to an automatic skip |
| Token age | how many minutes old | deliberately LEFT BLANK for the New Pairs hunt — the whole point is seeing it the moment it spawns |
| Top-10 holders %, bundle %, insider count | concentration/coordination | no single agreed number; use as a secondary sanity check, not a hard cutoff |

**Case for this approach:** cheap, fast, matches how the market actually moves — most coins that
ever get real volume get it in the first hour, so a tight age filter would filter out the very thing
you're trying to catch. The 10% sniper/dev caps are trying to catch the most common cheap rug setup
directly (see §2).

**Case against relying on filters alone:** every number above is a practitioner's personal rule, not
tested against outcomes anywhere I could find — no source backs "10% dev holding" with a hit-rate or
a loss-rate. Treat these as reasonable starting defaults, not proven thresholds. The one thing with
real research behind it is what's in §2 below, which is why the combined view puts §2's checks first
and Axiom's filters second, as a pre-screen.

**Combined recommendation:** use Axiom's filters as a fast pre-screen to cut the feed down (socials
ON, sniper ≤10%, dev ≤15% as a middle ground between the two guides, volume $500+), then run every
survivor through the §2 checklist by hand or through MCII before risking money. Filters narrow the
list; they don't clear a coin.

## 2. RUG AVOIDANCE — trader heuristics vs. the research

**What a "rug" actually is, mechanically, on pump.fun-style launches** (fact, multiple sources
agree): insiders buy cheap at the bottom of the bonding curve, hype it, real buyers push the price
up, insiders sell into that real demand, price collapses. No liquidity-lock trick needed for this
version — the bonding curve's own math (later buyers structurally pay more) is what insiders exploit.
A classic liquidity-pull rug (team removes the trading pool entirely) is the OTHER version, more
common once a coin has graduated to a normal Raydium pool.

**Trader checklist** (converged across TradingView, DEXTools, solanamemecoinz, solbundler — est,
practitioner consensus):
- top holder or dev wallet >15-25% (sources disagree on exact number, all agree "double digits is bad")
- liquidity not locked, or locked <30 days
- mint authority still open / freeze authority still open (MCII already checks this — see §0)
- trading volume made of many tiny, rapid, repeating buy/sell pairs = wash trading, not real demand
- no real socials, or socials with bot-looking followers / dead Telegram
- copied name, copied image, copied description from an older coin
- team anonymous with no track record (weak signal alone — most legitimate memecoin devs are also
  anonymous; only meaningful combined with the other flags)

**What the actual research papers found** (fact, cited below — this is the stronger evidence):
- A 2026 multi-feature detection paper (arXiv 2608.01609) found **presence of Twitter/Telegram/
  website was the single strongest predictor** in their model — the ABSENCE of socials mattered more
  than almost anything else they tested. Their model hit 92.7% accuracy, 95.2% AUC-ROC on their
  dataset — strong numbers, but this is one paper's held-out test set, not validated against MCII's
  own coin population.
- Same paper's concentration threshold: Gini coefficient >0.8 or top-address share >25% (their HHI
  cutoff) reliably flagged real rugs — this lines up closely with MCII's own top-10>40%/top-1>15%
  rule and with the trader consensus above. Three independent sources converging on "~15-25% single
  wallet, ~25-40% top handful" is the closest thing to a real number in this whole guide.
- A separate finding worth flagging on its own: **82.8% of meme coins with >100% gains showed
  evidence of artificial growth** (Mongardini & Mei, arXiv 2507.01963 — already in MCII's own
  research, [[market-manipulation-research]]). This matters here directly: a coin that's ALREADY
  pumping when you see it on Pulse or get FOMO'd into it is, on the base rate, more likely than not
  to be manipulated, not organically discovered. That's not a reason to never buy a mover — it's a
  reason the "it's already up 5x, socials look real, must be legit" read is backwards.
- No academic source specifically validated the "dev buys, sells a little, real buyers pile in, THEN
  it rugs" middle-dip chart pattern as its own predictive signal — MCII tested this directly on its
  own coin history 2026-09-09 ([[memecoin-lifecycle-pattern-research]]) and also couldn't confirm it
  on too small a sample. Don't trade that specific chart shape as if it's proven; the broader
  mechanism (insiders exit into real demand) is real, the specific visual pattern isn't validated.

**Where trader wisdom and research agree, use it as the hard checklist. Where they only have a
trader's gut number, treat it as a soft flag, not a stop rule:**
1. HARD: mint/freeze authority open → don't buy. (both agree, MCII already gates this)
2. HARD: no socials at all → don't buy. (research's strongest single predictor)
3. HARD-ish: top wallet/dev >20% → don't buy without a specific reason not to. (three sources converge near here)
4. SOFT: liquidity unlocked / lock <30 days → bigger position size only if everything else is clean
5. SOFT: wash-trade-looking volume (many identical tiny trades) → discount the volume number, don't zero it out
6. SOFT: coin already up big before you saw it → remember the 82.8% base rate before assuming the move is organic

## 3. FOMO / MOMENTUM COIN SELECTION

**The trap, stated plainly by every source:** by the time a coin's move is obvious enough to trigger
FOMO in you, the people who bought it early are often the ones now selling into your buy. Influencers
and feeds surface a coin AFTER it's already moved, not before.

**Trader entry rules for momentum specifically** (est, practitioner consensus, not paper-tested):
- want to see volume confirming the move, not just price — a price jump with flat/no volume is
  usually a thin-pool wick, not real demand
- want higher lows on the way up, not one spike then dead flat — a spike-then-nothing shape is the
  pump half of pump-and-dump with the dump not yet arrived
- want the price move to have a real trigger (mention volume, a listing, a wallet buy) rather than
  price going up simply because it's going up — "the price is the reason to buy" is named directly
  as the failure mode across sources
- position-size discipline: cap total memecoin exposure, size any single FOMO entry smaller than a
  researched one, because you have structurally less information than the people who bought it early

**Combined with the research above:** a coin that fits Axiom's clean-filter profile (§1) AND clears
the hard checklist (§2) AND is showing real volume-confirmed momentum (§3) is the strongest version
of "worth chasing." A coin that's ONLY showing momentum — clean filters and checklist unknown or
skipped because "it's already moving" — is exactly the population the 82.8% manipulation stat is
describing. The single biggest combined finding across all of this: **the coins most worth an
adrenaline-driven fast entry are the ones LEAST checked, and the ones best checked are usually past
the point where a fast entry still makes sense.** That tension doesn't resolve cleanly — it's the
real cost of trading this fast, not a solvable filter setting.

## 4. WHAT'S STILL UNKNOWN / UNPROVEN
- None of the specific numeric thresholds (10% sniper, 15-25% dev holding, 30-day LP lock) are
  backed by a tested win-rate anywhere found — they're converged-on trader convention, not measured
  edge. Worth remembering before treating any of them as a guarantee.
- The academic detection model's 92.7%/95.2% numbers are from one paper's own dataset — not
  independently verified, and not tested against Solana pump.fun-style coins specifically (several
  of the detection papers found were EVM/TON-chain focused; Solana's bonding-curve mechanism is
  structurally different from a typical liquidity-pool rug, per §2).
- Whether MCII's own top-10>40% threshold is the right level (vs the 25-30% some sources use) hasn't
  been tested against MCII's own coin outcomes — worth a real backtest before treating either number
  as final.

## SOURCES
- [Axiom Pulse Explained — Axiompedia](https://axiompedia.com/guides/trading/axiom-pulse-explained)
- [Best Axiom Trade Filters for New Pairs — Meme Coin Navigator](https://memecoinnavigator.com/best-axiom-trade-filters-for-new-pairs/)
- [Axiom Trade Setup for Beginners (2026) — solanasniperbot.net](https://solanasniperbot.net/axiom-trade-setup-guide/)
- [Pulse — official Axiom docs](https://docs.axiom.trade/axiom/finding-tokens/pulse)
- [Axiom Trade Review 2026 — Token Metrics](https://tokenmetrics.com/blog/axiom-trade-review/)
- [How to Spot Rug Pulls in Meme Coin Season — Medium](https://medium.com/@victorgray1913/how-to-spot-rug-pulls-in-meme-coin-season-before-they-drain-your-wallet-bae3ce9870f8)
- [What Is a Rug Pull in Crypto? — Solflare](https://www.solflare.com/crypto-101/what-is-a-rug-pull-in-crypto-and-how-to-avoid-it/)
- [How to Analyze Solana Meme Coins Before Trading — DEXTools](https://www.dextools.io/tutorials/how-to-trade-solana-meme-coins-safely-using-on-chain-tools)
- [5 Red Flags: How to Avoid Solana Meme Coin Scams — solanamemecoinz.com](https://solanamemecoinz.com/avoid-solana-meme-coin-scams-rug-pull/)
- [How to Avoid Pump.fun Rug Pulls in 2026 — solbundler.app](https://solbundler.app/blog/how-to-avoid-pump-fun-rug-pull-2026)
- [From Viral to Void: Multi-Dimensional Behavioral and Contractual Analysis for Rug Pull Identification (arXiv 2608.01609)](https://arxiv.org/html/2608.01609)
- [Rug pull detection on decentralized exchange using transaction data — ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2096720925000028)
- [How meme coins are made: bonding curves, Pump.fun, and rug pulls — crypto.news](https://crypto.news/how-meme-coins-are-made-bonding-curves-pump-fun-rug-pulls/)
- [The Ultimate Guide to Memecoin Entry and Exit Strategies — Medium](https://medium.com/@fxmbrand/the-ultimate-guide-to-memecoin-entry-and-exit-strategies-how-to-time-the-market-for-maximum-9bad76d015ed)
- [How to Never Be FOMO When Trading Memecoins Again — Medium](https://medium.com/@Neurotradingio/how-to-never-be-fomo-when-trading-memecoins-again-56b876708f2d)
- Already in MCII: [[market-manipulation-research]] (Mongardini & Mei, arXiv 2507.01963 — 82.8% stat),
  [[memecoin-lifecycle-pattern-research]] (dev-buy/dev-sell pattern test), `app/shared/safety.js`

## READ NEXT
- [[trading-strategy/README]] — how this connects to the entry-signal work already underway
- [[market-manipulation-research]] — the 82.8% manipulated-gains finding in full
