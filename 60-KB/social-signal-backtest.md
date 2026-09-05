---
id: kb.social-signal-backtest
t: kb
v: 2
upd: 2026-09-05
machine: connal
prio: high
---
# SOCIAL SIGNALS vs PRICE — the wide sweep Connal asked for, run honestly

!! run 2026-09-04: "start backtesting the social media data as much as possible run as many
statistics against as many outcomes as possible to get the most data and the most potential data
points/indicators." Done — 56 tests, every social feature we collect against forward price return
at four time horizons, using real historical data (`data/social.jsonl` × `data/market.jsonl`,
~26,000 feature/outcome pairs). Tool: `app/tools/backtest-social-signals.py`, rerunnable any time.

## THE HEADLINE RESULT: NOTHING SURVIVED THE ONE CHECK THAT ACTUALLY MATTERS
14 of the 56 tests looked significant even AFTER correcting for running 56 tests at once — real,
sizeable correlations (some over r=0.6), on real samples of 400-500+. That sounds like a strong
morning's work. **Every single one of the top 10 evaporated the moment it was checked separately
for each coin instead of averaged across all of them.** Not "weakened" — the DIRECTION of the
relationship flipped depending which coin you looked at. `diversity` at 24h: pooled r=−0.68 looked
like a strong negative relationship; broken out, three of four coins (CATE, ANSEM, DOGE-1) were
mildly POSITIVE, and one outlier (CASHCAT, r=−0.91) dragged the pooled number the other way
entirely. The same shape repeated for every one of the ten checked.
∴ this is a clean, textbook illustration of exactly the risk flagged before running anything:
combine several different coins into one pooled statistic and you can manufacture a confident-
looking number that describes none of them individually. This project already researched why
(Bailey & López de Prado's trials-counting logic, [[signal-architecture-research]]) — this is that
research playing out on real MCII data on the first real attempt, not a hypothetical.

## WHAT THIS MEANS FOR THE ALGORITHM WORK — read before building on any social correlation
- ! DO NOT feed a pooled cross-coin correlation into `admission.js` or anything scoring a coin.
  What looked like "more diverse posting predicts a price rise" was actually "CASHCAT behaves
  differently from the other three coins for reasons that have nothing to do with diversity."
- ✓ the existing design already avoids this trap structurally, and this result is why that design
  choice was right: `20-SPEC/scoring.md`'s HYPE score is deliberately compared against a coin's
  OWN trailing history, never against other coins' levels — "never cross-token, comparing CATE
  mentions to DOGE mentions is meaningless" was already the rule, before this test existed to prove
  it. This result is the receipt.
- ! `est:` conf 80% that ANY pooled-across-coins social statistic in this project should be treated
  the same way from now on — checked per-coin before it is trusted, not averaged and reported.

## WHAT'S ACTUALLY WORTH WATCHING, STATED AS A HYPOTHESIS NOT A FINDING
Two features — `uniqueAuthors` and `diversity`, both at the 24h horizon — pointed the SAME
direction (positive) in three of four coins checked (CATE, ANSEM, DOGE-1), with CASHCAT alone
going hard the other way. That is not confirmation; three same-direction data points is barely
more than the multiple-testing noise floor, and CASHCAT's contrary result is not obviously wrong
just because it is inconvenient. ! `est:` conf 40% this survives more data. Worth re-checking once
more coins and more time exist, not worth building on today.

## WHY THIS COULDN'T GO FURTHER — the caveat underneath the caveat
Even the per-coin numbers above are not fully independent observations the way a textbook
correlation test assumes. Social readings are taken every 30 minutes to an hour; a coin's posting
volume an hour from now looks a lot like its posting volume now, and price drifts the same way.
That autocorrelation means the TRUE number of independent data points behind an n of "143" is
smaller than 143 — how much smaller is not computed here. ∴ even the per-coin checks above should
be read as "did not obviously fail," not "confirmed." The honest ceiling on what this data can
prove right now is lower than the raw sample sizes suggest.

## !! RE-CHECKED 2026-09-05 — DOES A SOCIAL BURST'S EFFECT FADE OVER TIME, AS CONNAL PROPOSED?
Connal, pushing back on the walk-forward trend-candidate result the same night: the timing of a
social-driven move is probably short — a post only moves price while an algorithm (Twitter's FYP)
keeps surfacing it, and that window closes. Separately, some posts carry a LONGER-horizon signal —
his example: posts connecting the DOGE-1 memecoin to the real Dogecoin-funded rocket mission could
have flagged an early entry before the real +200% spike the mission's own news caused (Nov 2025,
`[[news-catalyst-research]]`). Both are real, distinct, testable ideas, and "all data is real data"
is the right instinct — a null result on one specific rule is not the same claim as "this data is
worthless," and the write-up above should not be read that way.
- Checked the FIRST idea directly against real numbers already collected, not dismissed: several
  features (`noiseFiltered`, `totalViews`, `engagement`) DO show exactly the rise-then-fade shape
  Connal described, POOLED across coins — effect size grows from 3h to a peak around 6-12h, then
  collapses (often flipping sign) by 24h. That is consistent with a real shelf-life.
- ! but the same per-coin check that broke the original findings breaks this one too: CATE, ANSEM,
  CASHCAT and DOGE-1 each point a DIFFERENT direction for every one of these features at every
  horizon, with no exceptions found. The rise-then-fade shape is real in the pooled number; it is
  not yet shown to be real for any ONE coin. It may be four different coins' unrelated patterns
  averaging into that shape by coincidence, not the same real mechanism in each.
- The SECOND idea (catalyst posts, e.g. the DOGE-1 rocket story) cannot be tested on our own past
  data — that spike happened Nov 2025, before this project existed or collected anything. It is a
  real, documented historical fact (per independent reporting), not something we can re-run
  numbers on. What IS real going forward: DOGE-1 is one of only two coins with enough clean history
  to test almost anything on, so a future real-world story about it is exactly the case to catch
  live, not after — this is a forward-looking watch, not a backward-looking finding.
- ∴ next real step, not yet built: separate "hype burst" posts from "real-world story" posts before
  testing either — right now every feature above lumps both together, which could be smearing two
  genuinely different mechanisms into one number that fits neither well. Needs a way to flag when a
  post references something happening outside crypto twitter (a name, an event, a launch date) —
  not built, and not to be built by guessing what that detector should look like without checking
  what data exists to build it from.

## SOURCES / METHOD NOTES
- Pearson correlation, computed from stdlib only (no scipy/numpy on this machine — checked).
- Significance threshold via Fisher's z-transformation (a standard large-sample approximation,
  not an exact p-value — this project runs no stats libraries and none were added for this).
- Multiple-testing context reported every run: with N tests at uncorrected p<0.05, expect
  N×0.05 to look significant from chance alone even if nothing tested is real.
