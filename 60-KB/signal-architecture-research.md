---
id: kb.signal-architecture
t: kb
v: 1
upd: 2026-09-01
machine: connal
prio: high
---
# SIGNAL ARCHITECTURE — how to ORGANISE a multi-sector scoring system
!! researched 2026-09-01 on Connal's instruction ("i am designing the algorithm that will analyze
the different data sectors of market data ... and the social media tracking data to assign
confidence levels and or buy/sell indicators ... do advanced deep research on what the best
organization systems are"). companion to [[social-signal-research]], which covers WHAT to extract;
this covers HOW TO ARRANGE it. sources at the bottom. `fact:` = citable, `est:` = my inference.

## THE ONE-LINE FINDING
**Every serious system converges on the same shape: a one-way pipeline of narrow stages, each
emitting a typed record, none reaching backwards — and DIRECTION is computed separately from
CONFIDENCE, by two different mechanisms.**
∴ the single highest-leverage organisational decision available to MCII is to stop treating
"buy/sell indicator" and "confidence level" as two outputs of one algorithm. They are two stages.

## WHY THAT SEPARATION IS THE HEADLINE
- fact @López de Prado, *Advances in Financial ML* (2018) / Wikipedia "Meta-Labeling": meta-labeling
  decouples predicting DIRECTION (the side) from predicting whether a signal will WORK (the size).
  A primary model emits direction; a secondary binary classifier emits P(this one is right), and
  that probability IS the position size. Below a threshold, size = 0.
- fact @same: the stated benefit is trading recall for precision — the primary model is allowed to
  be trigger-happy, and the secondary model kills the false positives.
- ! `est:` conf 85% — this maps onto Connal's request almost exactly. He asked for "confidence
  levels and/or buy/sell indicators". The literature's answer is: build the indicator first, then
  build a SEPARATE thing that scores the indicator, and never let one model do both.
- ! it also resolves the open worry already logged in `70-AREAS/trading-strategy/README`
  ("confidence determined by you [Claude]" → false precision). Confidence stops being a vibe the
  moment it is a scored, falsifiable output of a second stage with its own track record.
- ! falsifier: if after n≥50 the secondary stage's probability has no relationship to realised
  outcome (AUC ≤ 0.55), the separation bought nothing and the whole confidence layer is decoration.

## THE PIPELINE — the recommended stage list, and what each one owes the next
The two reference structures agree, and both are one-directional:
- fact @QuantConnect Algorithm Framework: Universe Selection → Alpha → Portfolio Construction →
  Risk Management → Execution. Each module's output is the next module's only input.
- fact @QuantConnect: the Alpha stage emits an **Insight** carrying **Direction, Magnitude,
  Confidence and Period** — and insights are emitted only when they CHANGE.
- fact @López de Prado, reviewed in *Quantitative Finance*: the "production chain" is data curators
  → feature analysts → strategists → backtesting specialists → deployment → portfolio oversight,
  with oversight structurally SEPARATE, and each role validating the others rather than siloed.
- ! `est:` conf 80% — for a two-person project the roles collapse into one person, but the STAGES
  must not. The value is the boundary, not the headcount.

Recommended MCII stages, in order. Each is a file with pure functions and its own record:

**0. THE RECORD (point-in-time).** every stored value carries the time it became KNOWABLE, not the
time of the thing it describes.
- fact @feature-store literature (Databricks/SageMaker/Feast "AS OF" joins): a training row must
  join the newest feature whose effective timestamp ≤ the decision timestamp, and nothing after.
- fact: the named failure when the two paths disagree is **training–serving skew** — features
  computed one way for fitting and another way for live use.
- !! LIVE HAZARD IN MCII TODAY: `70-AREAS/mcii-overview/OVERVIEW` states the app's live state and
  `data/*.jsonl` can disagree by up to the cron interval. If a rule is DESIGNED against the live
  15s state and EVALUATED against the twice-hourly record (or the reverse), the result is skew and
  the measured edge is an artefact. ∴ pick ONE surface as the algorithm's input and state it.
- ✓ their existing append-only JSONL (D-19) is already the right substrate; event-sourced,
  chronological, replayable. Nothing needs replacing — only the as-of stamp needs enforcing.

**1. UNIVERSE.** which coins are even eligible, recorded WITH THE REJECTS.
- ! this is where the documented discovery bias lives (`screener.js`: new profiles, paid/promoted
  listings, trending-by-volume — all either too-new or already-moved).
- ! D-63 already caught the consequence once: a rate computed from survivors-only storage read
  100%. Every later number inherits the universe's denominator. Store the rejected set + reason.

**2. FEATURES, PER SECTOR, INDEPENDENT.** market / social / safety / liquidity computed separately,
never blended here. Each emits `{value, n, reliability, asOf, source}`. This is already house
style ("no naked numbers", `20-SPEC/scoring.md`) — keep it and make it the type signature.

**3. GATES — non-compensatory, run BEFORE any score.** things that can never be outweighed.
- fact @fast-and-frugal-trees literature (Frontiers 2022; Springer *Minds and Machines*): simple
  lexicographic/non-compensatory rules — one question at a time, no trading-off — often GENERALISE
  better than regression, and Take-The-Best is robust "due to its simplicity, not despite it".
- fact @same: they are noncompensatory by construction, which is the point — a fatal cue cannot be
  offset by a good one.
- ∴ ✓ the existing RUG GATE is not a crude first draft to be replaced by a smarter weighted model
  later. It is the *correct family of model* for this data volume, and the research says the
  weighted version would likely be WORSE out of sample.
- gate list for MCII: safety FAIL | exitable value below the intended trade size | n too small |
  coordination detected | data staler than the horizon being predicted.
- ! `est:` conf 75%. falsifier: if a gated-out coin's realised outcomes are indistinguishable from
  the ungated population over n≥50, that gate is superstition and should be deleted.

**4. SIGNALS — many small, independent, versioned opinions.**
- fact @signal-library practice (WorldQuant ~4M live alphas; Two Sigma comparable): the design
  premise is that no single signal is reliable alone, and the edge comes from combining MANY weakly
  predictive signals **whose errors are uncorrelated**.
- ! `est:` conf 90% — MCII cannot and must not chase signal COUNT. Two people with a $30/mo cap and
  a handful of coins get the opposite lesson from that fact: with few signals, the *uncorrelated*
  half of the sentence is the only part they can act on. Three genuinely independent signals
  (structural safety, pool/flow, authentic-attention change) beat ten variations of momentum.
- each signal emits the Insight shape: `{direction, magnitude, confidence, horizon, why}`.
  ! HORIZON IS NOT OPTIONAL. a signal without a stated horizon cannot be scored, and unscoreable
  signals are how a project accumulates rules nobody can ever kill.

**5. COMBINATION — equal weights. Not an optimiser. Not a learned blend.**
- fact @DeMiguel, Garlappi & Uppal (2009) and replications: the naive 1/N rule is persistently hard
  to beat out-of-sample on Sharpe, certainty-equivalent and turnover, because estimation error
  swamps the theoretical gain from optimising.
- fact @robust-optimisation work (arXiv 2607.11054, 2606.12612): estimated optimal weights are
  unstable — small changes in the estimated error covariance produce large allocation swings — and
  **as ambiguity rises the robust optimum CONVERGES to equal weight**.
- ∴ ✓ combine standardised signals with equal weights, capped. Revisit only with n≫50 per signal.
- X **REJECT Dempster–Shafer evidence theory** despite it being the obvious-looking fit for
  "multiple unreliable sources that disagree". fact @D-S literature: when the conflict coefficient
  K→1 Dempster's rule "often contradicts common sense" and fails to produce a reasonable result —
  i.e. it is least trustworthy exactly in the case MCII cares about. It also fights D-50 (never
  average disagreeing sources): D-S exists to RESOLVE conflict into one number, and MCII's locked
  position is that conflict is information to display. Keep conflict as an OUTPUT.
- ! the resolution to the ranking problem: `20-SPEC/scoring.md` forbids cross-token z-scores (right
  — comparing CATE mentions to DOGE mentions is meaningless), but picking coins REQUIRES comparing
  them. Do it in two steps: z each signal against **the token's own history** to measure change,
  then rank the candidate set on the **percentile of that within-token z**. Comparable across
  coins, and no cross-token level comparison ever happens. `est:` conf 80%.

**6. CONFIDENCE — the second stage, initially a rubric, later a model.**
- until n≥50, confidence is NOT learned. It is an explicit evidence-quality score: how many
  independent sectors agree | n behind the thinnest input | whether sources disagree | data age vs
  horizon | whether this regime has any observations at all.
- after n≥50, replace with the real meta-label classifier (stage 6 becomes ML, stages 1–5 stay
  rules). ! D-05 already hard-locks the model until n≥50; this says what occupies the slot meanwhile
  instead of leaving it empty or letting an LLM freelance a number.

**7. ABSTAIN — "no call" is a first-class output and must be COUNTED.**
- fact @selective-prediction / conformal-abstention literature: abstaining trades coverage for
  error rate, and the honest report is accuracy **alongside coverage** — otherwise abstention looks
  free and a model can hit any accuracy by refusing to answer.
- fact @same: conformal guarantees hold only while the calibration set resembles live conditions —
  which in this asset class it frequently will not.
- ✓ MCII already does the hard half of this (D-24 THIN vs MANIPULATED; "UNRELIABLE — n too small"
  rendered instead of a number). The missing half is the ledger: **report what fraction of
  opportunities the system declined**. A rule that abstains 95% of the time and is right on the
  other 5% may be excellent or may be useless; only coverage tells you which.

**8. LABELS — decide what "right" means BEFORE building the picker.**
- fact @López de Prado: the **triple-barrier method** labels an observation by which of three
  barriers is hit first — profit target, stop loss, or time limit.
- ✓ this already matches the exit rule sketched in `70-AREAS/trading-strategy/README` (target /
  stop / time limit, plus an illiquidity override). Adopt it by name; it makes the labels standard
  and the evaluation comparable to published work.
- !! LABEL ON EXITABLE VALUE, NOT QUOTED PRICE. `60-KB/base-rates` already establishes quoted mcap
  ≫ exitable value on thin pools, and `20-SPEC/scoring.md` section B already computes max size at
  ≤5% slippage. A backtest labelled on mid-price is fiction in this asset class. `est:` conf 90%.

**9. GOVERNANCE — the part that decides whether any of this was real.**
- fact @Bailey & López de Prado, *Deflated Sharpe Ratio* (2014): the DSR adjusts the significance
  threshold by **the number of trials**, plus skew and kurtosis; the probability of selecting an
  overfit strategy **grows rapidly with the number of trials**. Their companion measure is the
  **Probability of Backtest Overfitting (PBO)**.
- ∴ !! this is the direct, citable answer to the open "rule-tweaking discipline" question in
  `70-AREAS/trading-strategy/README`. Connal wants rules "fully tweakable"; the maths says every
  tweak you evaluate and discard raises the bar the survivor must clear. The discipline is not
  "tweak less" — it is **COUNT THE TWEAKS**. Keep a trials counter per strategy family and quote
  it beside any result. An unlogged trial is a silently inflated score.
- fact @MLOps practice (MLflow aliases champion/challenger/shadow; DataRobot; Seldon/SageMaker):
  a new candidate runs in **shadow mode** — receives live input, its output is logged, never shown
  and never acted on — and is promoted only on a pre-declared metric, with instant rollback.
- ✓ ADOPT: version each strategy per test window, run challengers in shadow, promote on a metric
  chosen BEFORE the window opens. This is the same "decide once, log the reopen trigger" discipline
  the vault already runs on decisions, applied to rules.
- fact @López de Prado: use **purged and embargoed** walk-forward CV, not random splits — with
  overlapping labels, a random split leaks the future into training.

## MARKET-LEVEL ALERTS vs PER-COIN SIGNALS — one recommendation, stated once
`est:` conf 65% — market state should CONDITION the coin-level stage (scale confidence, or gate it
off entirely), not run as a competing second alert stream. Two independent streams means two
places to look and no defined behaviour when they disagree. ✓ consistent with D-62 (the sector view
answers "what kind of market is this", never "what should I get into").
! falsifier: if market-state readings turn out to have predictive value on their own that survives
n≥50, they have earned their own stream and this recommendation is wrong.

## WHAT I AM NOT CLAIMING
- `?` none of the architecture literature above is FROM crypto microcaps. It is quant equities,
  MLOps and decision science. The transfer claim is mine (`est:`), not a cited result. What
  transfers most safely is the *pipeline discipline*; what transfers least safely is any specific
  model or threshold.
- ! a claim of "78–85% accuracy predicting 24h meme-token moves from engagement data" surfaced in
  this search from a **vendor marketing blog** (walletfinder.ai), not a paper. NOT used above, NOT
  citable, and listed here only so a future session does not rediscover it and believe it.
- ! `est:` conf 70% — the realistic near-term win is unchanged from [[social-signal-research]]:
  reliably spotting manufactured promotion and structural danger, not forecasting winners. The
  architecture above is what stops that modest real edge from being buried under a confident number.

## THE FOUR THINGS THIS SAYS TO DO FIRST (ordered, worst-first)
1. Fix the point-in-time surface: choose live-state OR the cron record as THE input, and stamp
   as-of times. Everything downstream is uninterpretable until this is settled.
2. Split direction from confidence into two stages, even while stage 6 is a hand-written rubric.
3. Adopt triple-barrier labels on EXITABLE value, and write them down before writing the picker.
4. Start the trials counter and the shadow lane on day one. Retrofitting a trials count is
   impossible — the number is only true if it was kept from the beginning.

## SOURCES
- [Meta-Labeling (Wikipedia)](https://en.wikipedia.org/wiki/Meta-Labeling)
- [Meta Labeling: A Toy Example (Hudson & Thames)](https://hudsonthames.org/meta-labeling-a-toy-example/)
- [Triple-Barrier Labeling, Explained (Quant Memo)](https://www.quantmemo.com/concepts/triple-barrier-labeling)
- [Advances in Financial Machine Learning — review, Quantitative Finance](https://www.tandfonline.com/doi/full/10.1080/14697688.2019.1703030)
- [QuantConnect — Algorithm Framework overview](https://www.quantconnect.com/docs/v1/algorithm-framework/overview)
- [QuantConnect — Alpha Creation / Insight (direction, magnitude, confidence, period)](https://www.quantconnect.com/docs/v2/writing-algorithms/user-guides/algorithm-framework/alpha-creation)
- [The Deflated Sharpe Ratio (Bailey & López de Prado, SSRN)](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2460551)
- [Deflated Sharpe ratio (Wikipedia)](https://en.wikipedia.org/wiki/Deflated_Sharpe_ratio)
- [Statistical Overfitting and Backtest Performance (Bailey et al., LBL PDF)](https://sdm.lbl.gov/oapapers/ssrn-id2507040-bailey.pdf)
- [Minimum backtest length and the deflated SR (Jansen, ML4T)](https://stefan-jansen.github.io/machine-learning-for-trading/08_ml4t_workflow/01_multiple_testing/)
- [How Quant Hedge Funds Actually Build and Vet Trading Signals](https://youngandcalculated.substack.com/p/how-quant-hedge-funds-actually-build)
- [Optimal Versus Naive Diversification — DeMiguel, Garlappi & Uppal](https://scientificportfolio.com/external-research-anthology/victor-demiguel-lorenzo-garlappi-raman-uppal-2009/optimal-versus-naive-diversification-how-inefficient-is-the-1-n-portfolio-strategy/)
- [The equally weighted portfolio still remains a challenging benchmark (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S2110701724000489)
- [When and Why Naive Diversification Works (arXiv 2607.11054)](https://arxiv.org/html/2607.11054)
- [Transparent, simple and robust fast-and-frugal trees (Frontiers)](https://www.frontiersin.org/journals/human-dynamics/articles/10.3389/fhumd.2022.790033/full)
- [Simplicity and Robustness of Fast and Frugal Heuristics (Minds and Machines)](https://link.springer.com/article/10.1023/A:1008313020307)
- [Fast-and-frugal trees (Wikipedia)](https://en.wikipedia.org/wiki/Fast-and-frugal_trees)
- [An improved belief Hellinger divergence for Dempster-Shafer theory (Applied Intelligence)](https://link.springer.com/article/10.1007/s10489-022-04428-w)
- [Decision Fusion using Dempster-Shafer Theory (Edinburgh UDRC)](https://udrc.eng.ed.ac.uk/sites/udrc.eng.ed.ac.uk/files/publications/Decision%20Fusion%20using%20Dempster_Schaffer%20Theory.pdf)
- [Learning Conformal Abstention Policies (arXiv 2502.06884)](https://arxiv.org/html/2502.06884v1)
- [Conformal selective prediction with cost-aware deferral (Scientific Reports)](https://www.nature.com/articles/s41598-026-40637-w)
- [Point-in-Time Correctness for Training Data](https://apxml.com/courses/feature-stores-for-ml/chapter-3-data-consistency-quality/point-in-time-correctness)
- [Point-in-time feature joins (Databricks)](https://docs.databricks.com/aws/en/machine-learning/feature-store/time-series)
- [Ensuring Point-in-Time Correctness (eventsourcing.ai)](https://www.eventsourcing.ai/event-sourcing-and-ai/ensuring-point-in-time-correctness/)
- [ML Governance: The Champion-Challenger Pattern (StackSimplify)](https://stacksimplify.com/blog/ml-governance-model-registry/)
- [Introducing MLOps Champion/Challenger Models (DataRobot)](https://www.datarobot.com/blog/introducing-mlops-champion-challenger-models/)
- [MemeChain: A Multimodal Cross-Chain Dataset for Meme Coin Forensics (arXiv 2601.22185)](https://arxiv.org/abs/2601.22185)
- [Bridging Culture and Finance: A Multimodal Analysis of Memecoins (arXiv 2412.04913)](https://arxiv.org/html/2412.04913v3)
