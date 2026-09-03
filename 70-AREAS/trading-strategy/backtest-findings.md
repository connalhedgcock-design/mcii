---
id: area.trading-strategy.backtest
t: area-findings
v: 1
upd: 2026-09-02
machine: connal
---
# BACKTEST FINDINGS — walk-forward, market-only, on real historical prices

!! run with `node app/tools/backtest-walkforward.js` — cache lives at
`app/tools/.backtest-history-cache.json` (gitignored, rebuild it any time; GeckoTerminal's free
tier is slow, ~1 coin per 10-20s including retries).

## WHAT WAS ACTUALLY TESTED — read before quoting any number below
Connal asked for deep research on combining the data points, then real backtesting on prior coin
history without seeing the future, to see how well it does. Both halves delivered, scoped honestly:

- **The rule tested is MARKET-ONLY.** Social and wallet history cannot be reconstructed for past
  periods — there is no historical archive for either (D-27 already ruled out social backfill for
  exactly this reason; wallet history is theoretically fetchable on-chain but was not attempted
  here, see [[whale-tracking/README]]'s own unresolved hit-rate question first). So this tests one
  ingredient of the three-sensor design (`[[trading-strategy/README]]`), not the design itself.
- **The rule is a PROXY, not the real one.** D-38's actual definition of "accumulating" is holders
  and liquidity growing while price is flat — neither is retroactively available from price/volume
  candles alone. The nearest honest substitute: volume at least 2x its own 12h baseline while price
  stayed within ±5% over that same window. If this proxy fails, it does not clear D-38 of anything;
  it only says this particular stand-in did not work.
- **The sample is 4 coins with usable history**, out of 8 ever tracked — every coin this project has
  ever hand-added to a watchlist, not a random or bias-free launch cohort. LaPeace, ANSEM (both
  addresses), `fone` and `invest` returned no pool data from GeckoTerminal at all (too thin/too new
  to be indexed, or already dead — not established which). ! this is itself evidence for the base
  rate already in [[base-rates]]: most of what gets added does not survive long enough to leave a
  usable price record, before any strategy question is even asked.
- **Labels used the triple-barrier method** (profit target / stop-loss / time limit), on the barrier
  that fired first, over a 24h window — the same shape recommended in [[trading-strategy/README]].

## THE RESULT — stated plainly, no softening
**n = 11 signals. 1 hit its profit target, 8 hit the stop, 2 timed out. Hit rate among decisive
trades: 11%. Average return per signal across all outcomes: −9.7%.**
This specific rule, alone, on this sample, lost money more often than it made it. That is the
honest reading and it is not explained away here — a rule that loses on a small sample might still
be fine or might genuinely be bad; the sample is too small to tell the difference, which is the
next point.

## ! WHY THIS CANNOT DRIVE ANY REAL DECISION — and what would fix that
- `n=11` is far below D-05's `n>=50` bar for trusting any performance claim. Nothing above should
  change a real number in the app or a real dollar of position sizing.
- fact @Bailey & López de Prado, Deflated Sharpe Ratio: the more variants of a rule get tried, the
  better the survivor must look to mean anything. This was trial #1 of ONE un-tuned rule. Tuning it
  against this same 11-trade sample until it looks better would be exactly the overfitting that
  discipline exists to catch — ! do not do that. A different rule needs a different, later sample.
- ∴ what this genuinely proves: the WALK-FORWARD MECHANISM has no lookahead — verified by
  construction (the feature loop and the label loop never read the same index) and by the tool
  giving small, specific, checkable numbers rather than one confident summary figure. That
  machinery is the reusable asset, not this particular result.
- ∴ what would make a real test possible: far more coins in a genuinely point-in-time universe
  (hard to build for free — see below), and real social+wallet history accumulating LIVE going
  forward, which cannot be reconstructed backward no matter how this script is improved.

## WHAT WOULD BE NEEDED FOR A REAL, UNBIASED UNIVERSE — researched, not yet buildable for free
- fact: survivorship bias can inflate a naive crypto backtest's apparent return by 200–400% —
  testing only coins someone already chose to remember is close to the worst case of this.
- fact: the correct fix is point-in-time universe construction — reconstruct which coins existed
  AT each past moment, including the ones that later died, using only what was knowable then.
- ! this project's free data sources do not offer a historical "every pool that existed on date X"
  browse — GeckoTerminal's new-pools feed is a live/recent feed, not a queryable past archive, and
  a genuinely unbiased sample would need either a paid historical listings API or building that
  archive by collecting it forward from today, same shape as every other "cannot backfill, must
  start now" finding already in this vault.

## SOURCES
- [Survivorship Bias in Market Data (Bookmap)](https://bookmap.com/blog/survivorship-bias-in-market-data-what-traders-need-to-know)
- [How to Eliminate Survivorship Bias in Crypto Backtesting (CoinAPI)](https://www.coinapi.io/blog/how-to-eliminate-survivorship-bias-in-crypto-backtesting)
- [Survivorship Bias: Dead Coins Your Backtest Ignores (StratBase)](https://stratbase.ai/en/blog/survivorship-bias-crypto)
