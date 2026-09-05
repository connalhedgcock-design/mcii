---
id: kb.trend-candidate-walkforward
t: kb
v: 1
upd: 2026-09-05
machine: connal
prio: high
---
# DOES THE TREND-CANDIDATE SCORE PREDICT ANYTHING? — walk-forward test, run the night it launched

!! Connal, 2026-09-05, on putting the untracked-coin trend list on screen while it's still unproven:
"we will have to continue to do analysis of our records on what this data does ... please run tests
on it even though it is still on display." This is that test, run immediately, not deferred.
Tool: `app/tools/backtest-trend-candidates.py`, rerunnable any time as more scans accumulate.

## WHAT WAS TESTED
`app/tools/find-trending-candidates.js` ranks untracked coins by a CONSISTENCY score — how much of
their scan-to-scan price movement agreed with the overall direction. The real question: does a high
consistency score, using only data available AT THE TIME, actually say anything about what the coin
does NEXT? Walked forward through every real scan reading (no lookahead — the score at each point
used only readings up to that point, checked against the very next reading, which the score could
not see), per coin, never pooled (same reason as the other two backtests this week).

## THE RESULT
**40 coins had enough history to test. 5 showed a significant link (all "more of the same
direction"), 0 showed reversal, 35 showed nothing.** That sounds like a working signal until the
same check `[[social-signal-backtest]]` used is applied: at an uncorrected 5% significance level,
testing 40 coins should produce roughly 2 false positives from chance alone. 5 is only somewhat
above that, and — the more telling detail — **the 5 "significant" coins are NOT the best-sampled
ones.** `fone` (n=295), `OTC` (n=290) and `STONK` (n=268) — the three coins with by far the most
walk-forward decision points, and so the most trustworthy tests — all came back essentially at
zero (r=−0.09, +0.03, −0.00). The significant hits (MACRODUCK n=68, TOAD n=56, GATO n=26, inuzard
n=29, BREAKING n=18) sit at moderate-to-small sample sizes, which is exactly the pattern you would
expect if these five are noise that happened to clear the bar, not a real effect concentrated in
smaller samples.

∴ **the honest read is that this consistency score currently shows no demonstrated ability to
predict a coin's next move.** The best-tested coins say no; the coins that said yes are the
least-tested ones. This does not mean the underlying trend list is worthless as a discovery
source — a coin sustaining a real climb is still worth a human's attention — it means the specific
CONSISTENCY NUMBER should not be read as a working prediction yet, and nothing should auto-act on
it.

## WHAT THIS CHANGES
- The list can go on screen — Connal's call, and there is nothing dangerous about showing it, same
  as the manipulation/coordination flags already shown as flags, not verdicts.
- ! it must be shown as an unranked-by-reliability observation, not a score that implies it works —
  same false-precision anti-pattern the mandate already bans ("hype score 73.4").
- Nothing here feeds `admission.js`. T-023 (should this ever feed the algorithm) is answered for
  now: not yet, on this evidence.
- Re-run this test as more scans accumulate, especially for `fone`/`OTC`/`STONK` — if their
  own numbers ever turn significant with more data, that is a real finding; a handful of
  small-sample coins turning significant and then un-significant as they gain data is the
  expected shape of noise settling out, not evidence of anything changing.

## CAVEATS, STATED PLAINLY
- Same watchlist/universe bias as everything `screener.js` finds — these are still only
  DexScreener new/promoted listings and GeckoTerminal trending-by-volume, not a random sample.
- The autocorrelation caveat is STRONGER here than in the other two backtests: the consistency
  score and the outcome it's tested against come from the same continuous price series, so this is
  really a momentum-vs-mean-reversion question for one coin's own history, not an external signal
  being validated. Framed as exactly that above, not reused from the other files' framing.
- Multiple-testing context repeated deliberately, same as `[[social-signal-backtest]]`: with 40
  tests at uncorrected p<0.05, expect ~2 "significant" results purely by chance.

## SOURCES / METHOD
- Pearson correlation + Fisher-z significance threshold, stdlib only (no scipy/numpy on this
  machine) — same method as the other two backtests this week, for direct comparability.
