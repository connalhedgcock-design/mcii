---
id: kb.social-research
t: kb
v: 1
upd: 2026-09-01
machine: connal
prio: high
---
# SOCIAL SIGNAL — what the literature actually supports pulling out of a tweet
!! researched 2026-09-01 on Connal's instruction ("read verifiable research papers... learn what we
should be pulling out of each tweet and how valuable that information is"). ! sources listed at the
bottom. everything here is `fact:` w/ a citation or explicitly marked `est:`.

## THE ONE-LINE FINDING
**Detecting fake/coordinated promotion is well-supported. Predicting price from mood is not.**
∴ per-tweet extraction should be aimed at answering "is this real interest or a manufactured
campaign", NOT at "what will the price do". The project already assumed this (D-23 treats
promotional language as a manipulation marker rather than sentiment) — the literature independently
backs that call, which is a genuine confirmation rather than a coincidence.

## TIER 1 — ROBUST. well-replicated, generalizes, cheap for us to compute
- fact @Botometer/Yang-Menczer: **account age** is a primary bot indicator; bot accounts skew
  much more recently created than human ones.
- fact @Botometer: **posting rate** (avg time between consecutive posts / posts per day) is a core
  temporal feature; high frequency indicates automation.
- fact @Botometer: the production classifier uses >1,000 features across profile, friends, network,
  temporal, content and sentiment categories. ! we cannot and should not replicate that — but the
  cheap profile+temporal subset is the part that carries most of the weight for our purpose.
- fact @Nizzoli-et-al / coordination survey: **time-synchronised posting across accounts is THE
  coordination signal.** repeated co-posting of the same content by the same set of accounts inside
  narrow windows (1 minute up to ~8 hours) is treated as implausible without central coordination.
- fact @astroturfing lit: **clustered account-creation dates** among accounts pushing one thing, and
  **abrupt posting spikes**, are standard orchestration indicators.
- ! `est:` conf 80% — of everything above, synchronised timing is the highest-value thing MCII does
  NOT currently compute, and it is nearly free: we already store `createdAt` on every post.

## TIER 2 — DOCUMENTED, DOMAIN-SPECIFIC, WORTH KNOWING
- fact @Xu-Livshits-lineage / ScienceDirect: pump-and-dump schemes **concentrate in coins under
  ~$50M market cap**. !! that is exactly the band both operators trade in — this is not a signal
  about someone else's market, it is about theirs.
- fact: scheme operators **coordinate across multiple channels simultaneously** ∴ a coin appearing
  suddenly across several unconnected-looking sources is a warning, not a confirmation. ! this is
  the opposite of the naive reading, and worth stating plainly to Connal.
- fact @arXiv 2412.18848: real-time detection reported F1 0.79 (LightGBM) and 0.83 (transformer)
  on pre-pump features; another line of work reports >75% accuracy identifying price hikes from
  information available BEFORE the pump starts, using tree ensembles on market + social features.
- ! `est:` conf 55% — those numbers will not transfer to us intact. they are trained on labelled
  historical schemes on centralised exchanges, and our setting (solana AMMs, seconds-old coins) is
  not the same distribution. treat as evidence the problem is tractable, NOT as an achievable score.

## TIER 3 — WEAK. do not build on this
- fact @systematic review of 52 publications: overfitting, data quality and pre-processing are
  systemic limitations across the social-sentiment→BTC-price literature.
- fact: prior SVM/CNN sentiment models show **train–test accuracy gaps of 12–15 percentage points**.
- fact: **concept drift** is explicit in this literature — "a sentiment-trading strategy that worked
  in 2017 may fail by 2025". ∴ any sentiment→price rule needs re-validation on recent data, always.
- fact: sentiment signals are noisy AND manipulable, with a documented **echo-chamber / self-
  fulfilling** failure mode where traders amplify the mood the model measured.
- ∴ ! X mood as a price predictor stays banned as a standalone signal. this matches the existing
  posture ([[mandate]]: no claim without a falsifier; [[base-rates]]: a thesis must say HOW it beats
  the base rate). ! if we ever do test it, it needs out-of-sample validation on a later window than
  it was fitted on — in-sample fit is worthless here and the literature is full of it.

## WHAT THIS MEANS WE SHOULD EXTRACT PER TWEET
Ranked by (evidence strength × cheapness for us). We already receive every field below — see
`twitterapi.js: normalize()` — and currently use only text, authorId and engagementRate.
1. **every contract address in the text** — exact coin identity, no ticker collision (D-73). the
   single cleanest discovery signal available and currently discarded.
2. **every ticker mentioned**, w/ distinct-author counts (already partly done, `unknownTickers`).
3. **author credibility bundle**: `author.createdAt` (age), `postsPerDay`, `declaredAutomated`
   (X's own label), `defaultAvatar`, `followers`/`following`, `verified`. → weight each mention.
   ! this upgrades "3 different people" into "3 different PLAUSIBLE people", which is the whole
   difference between a signal and a botnet.
4. **posting-time clustering per coin** — the Tier-1 coordination signal. if the N accounts naming
   a coin all posted inside a few minutes, that is a campaign, not a discovery.
5. **`source`** (which client app posted it) — automation tell, currently captured and unused.
6. **engagementRate** — already used (D-25). reach without reaction = promotion.

## OPEN / NOT ANSWERED BY THIS PASS
- `?` no paper found that evaluates any of this on SOLANA MICROCAPS at minutes-to-hours horizons.
  the pump-and-dump work is mostly centralised-exchange, longer-horizon, larger-cap. ! do not claim
  transfer without testing it here.
- `?` the >75% / F1 0.83 numbers have no published out-of-sample-in-our-regime replication.
- ! `est:` conf 70% — our realistic near-term win is the same one this project keeps landing on:
  reliably spotting manufactured promotion, not forecasting winners.

## SOURCES
- [Twitter and cryptocurrency pump-and-dumps (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S1057521924004113)
- [Detecting cryptocurrency pump-and-dump frauds using market and social signals (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0957417421007156)
- [Machine Learning-Based Detection of Pump-and-Dump Schemes in Real-Time (arXiv 2412.18848)](https://arxiv.org/pdf/2412.18848)
- [Crypto Pump and Dump Detection via Deep Learning (arXiv 2205.04646)](https://arxiv.org/pdf/2205.04646)
- [Scalable and Generalizable Social Bot Detection (arXiv 1911.09179)](https://arxiv.org/pdf/1911.09179)
- [Detection and Characterization of Coordinated Online Behavior: A Survey (arXiv 2408.01257)](https://arxiv.org/pdf/2408.01257)
- [Coordination patterns reveal online political astroturfing across the world (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8930979/)
- [Attention-augmented hybrid CNN-LSTM for crypto sentiment (Nature Sci Reports)](https://www.nature.com/articles/s41598-025-18245-x)
