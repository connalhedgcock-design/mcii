---
id: kb.baserates
t: kb
v: 1
upd: 2026-08-23
prio: high
---
# BASE RATES — the priors. quote these before any thesis. update quarterly.
! rule: a thesis that requires beating a base rate must say HOW it beats it. "this one's different" without a mechanism = rejected.

## LAUNCH SURVIVAL
- fact @theblock/coinlaw: pump.fun graduation rate ~**0.26%** (Jun 2026), down ~80% in 3mo. was ~1–2% through 2024.
  ∴ ~997 of every 1000 launched tokens never even reach a real AMM pool. the modal outcome is zero.
- fact @coinlaw: ~97% of memecoins since Jan-2024 have died or lost ~all volume.
- fact @chainalysis 2025: ~74,037 tokens launched in 2024 flagged as suspected pump-and-dump ≈ 3.59% of all launches that year.
  ! that 3.59% is *detected* schemes. treat as a floor, not an estimate.

## TRADER OUTCOMES  ! sources conflict — record the conflict, don't cherry-pick
- 2024/25 sample: ~60% of pump.fun wallets lost money; ~24% made <$100; only ~3% made >$1,000; ~0.04% made >$10,000.
- 2026 sample @coininsider: profitable wallets rose 56.8% (Feb-26) > 73.3% (Apr-26).
- ! reconcile before quoting either: the 2026 figure is almost certainly (a) a bull-window snapshot, (b) survivorship-biased (dead wallets stop trading and drop out of the denominator), (c) measuring *any* realized gain, not risk-adjusted or fee-net. the 2024 figure measures a different thing over a different regime.
- ∴ honest statement to operators: **in every regime measured, the money is concentrated in a thin top tail, and the tail is mostly early/informed/automated flow.** the disagreement is about the middle, not the tail. conf 85%.
- ! do NOT tell them "73% of traders are profitable." it's technically sourced and practically misleading. this is exactly the grifter-parroting they hired me to prevent.

## STRUCTURE
- memecoin correlation: microcaps → ~1.0 with each other in drawdowns; high beta to SOL/BTC risk appetite. holding N memecoins ≈ holding 1 leveraged bet on retail risk-on. see [[grill]] G-11.
- liquidity asymmetry: quoted market cap ≫ exitable value. always compute $-out-at-5%-slippage. a $2M "market cap" with $18k of pool depth is a ~$900 position, not a $2M asset.
- fee/spread drag: on-chain swap + priority fee + slippage + MEV ≈ meaningful % per round trip on thin pools. an edge under ~2-3% round trip is not an edge.

## FORECASTING (why the calibration gym matters)
- fact: unaided human forecasters are systematically overconfident; measured accuracy improves mainly via (a) explicit probability + (b) scored feedback + (c) forced consideration of the opposite. this is the entire evidentiary basis for [[_tpl-thesis]].
- ! short samples in high-σ assets cannot separate skill from luck. n≥50 resolved forecasts before any performance claim. see [[grill]] G-02.
