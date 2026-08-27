---
id: spec.scoring
t: spec
v: 1
upd: 2026-08-23
---
# SCORING — the math. every score ships with a reliability flag + n. no naked numbers.

## A. RUG GATE  ! runs FIRST. blocks everything else in the UI.
severity: CRITICAL / HIGH / MED
- CRITICAL: mint_authority active | freeze_authority active | LP not burned-or-locked | honeypot sim fail | metadata mutable+unverified
- HIGH: top10 holders ex-LP/ex-burn >25% | creator holds >5% | pool depth <$30k | single-wallet >10%
- MED: pool age <72h | <50 unique holders | no socials/site | dev wallet funded from a mixer or from a wallet that funded prior rugs
RULE: any CRITICAL > token renders RED, HYPE score is **hidden not shown**, thesis template refuses to save.
∵ behavioral design: the exciting number must be unreachable until the safety check passes. friction placed exactly where the money is lost.
sources: RugCheck + GoPlus + our own onchain checks. ! disagreement between sources = show both, don't average. averaging a safety signal is how you get a soft "medium risk" on a honeypot.

## B. EXITABLE VALUE  (the single most useful number in the app)
- via Jupiter quote sim: for size s, actual_out(s). solve max{s : slippage(s) ≤ 5%}.
- display: `HOLDING $X notional / EXITABLE $Y at 5% slip` — and if Y/X < 0.5, show that ratio in red, big.
- recompute on every price poll. it moves faster than price.

## C. ATTENTION / "HYPE"  — per token, per 15m bucket
inputs per bucket:
- V = matched post count (ticker OR contract address; CA match weighted 3x ∵ far lower false-positive rate)
- E = Σ log1p(likes + 2·replies + 3·reposts)      # log to stop one viral post dominating
- U = unique authors
- D = author diversity = 1 − HHI(author share)     # 5 accounts spamming > D→0
- N = novelty = frac(authors first seen <24h)
- S = engagement-weighted sentiment = Σ(w_i·s_i)/Σw_i, s∈[−1,1], w=log1p(engagement)

HYPE_raw = z(log1p(E)) vs the token's OWN trailing 30d distribution
! z against its own history, NEVER cross-token. comparing CATE mentions to DOGE mentions is meaningless.

derived (the parts that actually matter):
- **VEL** = ΔHYPE / Δt
- **ACC** = Δ²HYPE        ← G-01 says this is the only component with a plausible edge
- **DIV** = z(HYPE) − z(price_return)
  - DIV ≫ 0 : attention with no price > possible lead OR possible paid shill campaign. ambiguous by design — show both readings.
  - DIV ≪ 0 : price with no attention > distribution/exit signal. treat as a RISK alert.

## D. AUTHENTICITY GATE  ! fail loud, do not silently downweight
bot_ratio est from: account age, follower/following ratio, post cadence, duplicate-text clustering (minhash), coordinated timing (posts within same 60s window).
- if D < 0.40 OR bot_ratio > 0.50 OR U < 25 > HYPE renders as **"UNRELIABLE — n too small / coordinated"**, not as a number.
- ∵ a silently-downweighted score still looks like a score. a novice will read it as one. see [[ops]].
- ✓ coordinated inauthentic amplification detected = that is itself a **negative** signal, not a neutral one. surface it as such.

## E. NEWS  (the grounded counterweight)
- separate index from social. never blend into HYPE. news moves slower and is far less gameable.
- NEWS_TONE = source-credibility-weighted sentiment. maintain an explicit source tier list (tier1 reuters/bloomberg/coindesk-reporting … tierN press-release wire / paid placement).
- ! flag press releases and sponsored posts explicitly. a "partnership announcement" written by the project is marketing, not news.
- DIVERGENCE(social bullish, news silent/negative) = one of the highest-value alerts in the system.

## F. RISK MONTE CARLO  (per G-07 — risk only, never upside)
- bootstrap from the token's own realized 5m returns, block-bootstrap (preserve vol clustering), 10k paths, 7d horizon.
- output ONLY: P(drawdown ≥50% in 7d), P(≥80%), expected max drawdown, and the empirical 5th percentile.
- ! render alongside: "this model CANNOT see a rug or an LP pull — those are structural, see the RUG GATE." state the model's blind spot next to the model's output, always.

## G. CALIBRATION
- Brier per forecast; rolling Brier + reliability curve on a dashboard tab.
- benchmark vs (a) always-say-50%, (b) the Kalshi/Polymarket implied price where one exists.
- ! if rolling Brier > 0.25 (worse than a coin flip) after n≥50, the honest conclusion is the process has no demonstrated edge. the app must SAY that, plainly, on screen. no softening.

## H. THE GATE  ! hard-coded, non-overridable in UI
proto-model emits nothing until: n≥50 resolved predictions AND out-of-sample AUC(ACC > 24h fwd return) > 0.60 on a walk-forward split.
until then UI shows: `MODEL LOCKED — n=__/50`.
∵ [[grill]] G-02. the failure mode this prevents is the one most likely to actually cost them money.
