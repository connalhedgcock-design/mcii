---
id: kb.coin-stage-pump-dump-research
t: kb
v: 1
upd: 2026-09-10
machine: connal
prio: high
---
# WHAT STAGE IS A COIN IN, AND HOW DO YOU TRADE ITS INDIVIDUAL PUMPS/DUMPS — external evidence

Same session as [[dip-buy-exit-tier-research]]. Connal's second ask: how to tell what stage a coin
is currently in, and how to buy/sell the individual pump and dump swings inside a coin's life, not
just the whole-position entry/exit already covered there.

## DIRECT ANSWER
There are two different "stage" frameworks that answer two different questions, and MCII's own data
cadence rules out trading the fastest version of either. The STRUCTURAL stage (created → filling up
→ moved to a real exchange → trading freely) is mechanical and checkable right now from data MCII
already has. The MANIPULATION stage (accumulation → pump → dump) is real and documented, but the
academic detectors for it either need minute-level data MCII doesn't collect, or only confirm the
pump AFTER it's already near the top — nobody has a method that reliably calls it early. This
doesn't reopen D-20/D-36 (no sniping, nothing under 2h old) — if anything it reinforces why that
rule exists.

## STRUCTURAL STAGE — mechanical, checkable, not about manipulation

fact @[Pump.fun docs / Solana Tracker](https://docs.solanatracker.io/guides/pumpfun) +
[j.tools bonding-curve breakdown](https://j.tools/en/blog/pump-fun-bonding-curve-mechanics-explained):
every pump.fun coin moves through the same three states — **Created** (live on the bonding curve,
not on any real exchange yet) → **Graduating** (the curve fills from 0-100% as people buy) →
**Graduated** (curve hits $69,000 market cap / ~85 SOL raised, liquidity migrates automatically to a
real DEX pool). The curve's math itself gets steeper as it fills — the first half of the supply is
cheap, the last 20% costs disproportionately more — so late buyers on the curve can be underwater
within minutes even on a coin that goes on to graduate successfully. That's the pricing formula
working as designed, not a scam signal by itself.

fact @[MemeTrans, arXiv 2602.13480, Feb 2026, Solana memecoin dataset]: an independent academic
model of the same lifecycle names four stages (creation, bonding-curve sale, migration, DEX
trading) and gives concrete RISK indicators for judging a coin mid-lifecycle: shorter sale duration,
fewer transactions/holders, larger per-buyer accumulations, and skewed holding concentration
(few wallets holding most supply) all correlate with high-risk launches. It also separately flags
"bundle" wallets — multiple accounts coordinating to hide true ownership concentration — which is
the same shape MCII's own wash-trade filter already targets. ! this paper's migration threshold is
stated as 80% sold, not pump.fun's own $69k/100%-curve figure — likely a different platform variant
or the paper's own definition; noted as a discrepancy, not reconciled here.

∴ est, conf 70%: "what stage is this coin in" is answerable today, mechanically, from data MCII
already has for pump.fun-origin coins (bonding-curve % filled, or already-migrated) — this is a
much cheaper and more certain read than trying to detect manipulation stage, and could be shown
in the app with no new data collection. Not yet proposed as a build — flagging that it's cheap.

## MANIPULATION STAGE — accumulation / pump / dump, real but hard to catch live

fact @[arXiv 2504.15790, "Microstructure and Manipulation," 2025]: real pump-and-dump events studied
break into three phases —
1. **Accumulation** — insiders quietly build a position. Detectable in 69.3% of studied events,
   averaging ~1.5 days (2,160.8 min) before the announcement; sometimes only seconds-to-a-minute of
   volume spike right before the pump starts (the paper splits these into "pre-accumulated" vs.
   "on-the-spot" tokens — the second type gives no warning at all).
2. **Pump** — minutes long. High/low price diverges sharply during the pump, then reconverges right
   after. Volume spikes exponentially.
3. **Dump** — insiders sell in STAGED TRANCHES, not all at once: the paper's own example is roughly
   20% sold around 50% of peak price, 30% around 60% of peak, and the remaining 50% around 80% of
   peak. ∴ a price cracking downward is not proof the insiders are "done" — it can be the first
   tranche, not the last.

fact @[arXiv 2503.08692, thresholding-based P&D detector]: the best real-time detection rule found
in the literature flags a pump when price is up 90%+ against its own 12-hour moving average AND
volume is up 400%+ against a volatility-adjusted baseline. Even with that rule tuned and tested, it
only achieved an F1 of 0.71 (25 caught, 15 missed) and — critically — **it detects the event DURING
or immediately AFTER the pump phase, not before it.** No method in this research calls the top or
the start reliably in advance.

fact: multiple sources agree the full cycle can run "a few seconds to a few minutes." ∴ any method
that needs to observe volume/price and then act has, at best, a couple of minutes of window — MCII's
own collection cadence (30min-2h per [[70-AREAS/trading-strategy/README]]) cannot see inside that
window at all. This is not a data-quality gap to fix; it's a physical mismatch between the update
scale of the underlying manipulation and this project's stated always-on-two-laptops architecture.

## HOW OTHERS TRADE THE DUMP PHASE (found, not recommended)

fact @[TradingWithRayner, pump-and-dump trading guide]: one documented mechanical rule for trading
the REVERSAL (i.e. getting out, or shorting if that were in scope — MCII doesn't short) is: treat
the moment price/volume momentum crosses below its own short moving average as the reversal signal,
and treat a new high beyond the prior peak as proof the reversal thesis was wrong (get back out of
the short / don't re-enter). This is a real, citable rule for "how do I know the pump is actually
rolling over" that doesn't require calling the top in advance — it reacts to the break, which is the
same philosophy as this vault's already-adopted triple-barrier exits (react to a threshold being
crossed, not to a prediction).

The same source and several others (Colibri Trader, SmartOptions, Bravos Research) are explicit that
the strongest tell of being inside a pump-and-dump is the FEELING itself — "everyone is making money
except me" — engineered urgency, not a chart pattern — and that doing nothing under that specific
feeling is the highest-value skill named in this literature. Also explicit, and worth stating
plainly rather than skipping past: several of these sources frame deliberately TRADING a P&D you can
identify as ethically and legally fraught if you are the one initiating or amplifying it — that
caveat is about being the manipulator, not about a retail trader recognizing one already in progress
and choosing to exit or sit out, which is what MCII does.

## WHAT THIS MEANS FOR MCII SPECIFICALLY

- The STRUCTURAL stage (curve-fill %, graduated or not) is cheap, mechanical, and buildable now —
  MCII already has or can derive this per coin without new data collection.
- The MANIPULATION stage (accumulation/pump/dump) is real, but every credible detector either needs
  minute-level data MCII doesn't collect, or confirms the event only once it's already underway —
  matching this vault's OWN tested finding in [[memecoin-lifecycle-pattern-research]] that the
  specific dev-buy → dip → re-pump shape didn't show up as a usable early signal in MCII's own coin
  history (n=2, too small to trust, but consistent with the outside literature's own limits here).
- The one piece of this that's genuinely actionable at MCII's cadence: the 12-hour-moving-average
  threshold detector (90% price / 400% volume) uses an HOURLY-scale window, which is closer to
  MCII's own 30min-2h collection cycle than the seconds-scale stuff is — this is the one external
  method worth a real backtest against MCII's own `data/*.jsonl` history before it's dismissed as
  "too fast to use." Not yet tested — flagged as the one concretely testable idea from this research.

## FALSIFIERS
- If a real backtest of the 12h-MA/400%-volume rule against MCII's own tracked-coin history produces
  a usable hit rate (n≥50, D-05), that overturns "manipulation stage can't be caught at our cadence."
- If the structural-stage read (curve %, graduated/not) turns out to already be shown somewhere in
  the app and this is redundant, that overturns "cheap and not yet built" above — worth a quick check
  before building anything from this section.

## SOURCES
- [Solana Tracker — Pump.fun & Bonding Curves](https://docs.solanatracker.io/guides/pumpfun)
- [j.tools — Pump.fun Bonding Curve: Formula, Phases, Graduation](https://j.tools/en/blog/pump-fun-bonding-curve-mechanics-explained)
- [arXiv 2602.13480 — MemeTrans: A Dataset for Detecting High-Risk Memecoin Launches on Solana](https://arxiv.org/html/2602.13480v1)
- [arXiv 2504.15790 — Microstructure and Manipulation: Quantifying Pump-and-Dump Dynamics](https://arxiv.org/html/2504.15790v1)
- [arXiv 2503.08692 — Detecting Crypto Pump-and-Dump Schemes: A Thresholding-Based Approach](https://arxiv.org/html/2503.08692v1)
- [arXiv 2412.18848 — Machine Learning-Based Detection of Pump-and-Dump Schemes in Real-Time](https://arxiv.org/html/2412.18848v1)
- [TradingWithRayner — Pump and Dump Strategy Guide](https://www.tradingwithrayner.com/pump-and-dump/)

## RESEARCH RECORD
Web search + full-text fetch of four arXiv papers, 2026-09-10, same session as
[[dip-buy-exit-tier-research]]. Figures taken as reported in the papers' own text/abstracts via
fetch, not independently re-derived or re-run against MCII data. Stopped once the structural
(bonding-curve) and manipulation (accumulation/pump/dump) frameworks both had direct sourced
evidence and a stated MCII-specific limit — further queries were returning restatements of the same
handful of papers.
