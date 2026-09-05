---
id: area.trading-strategy.admission-backtest
t: area-findings
v: 1
upd: 2026-09-04
machine: connal
---
# ADMISSION ALGORITHM — backtest attempt, and what actually limits it

!! run 2026-09-04 on Connal's instruction, same evening the algorithm (`shared/admission.js`) and
the FOMO-notification reader (`main/adapters/fomonotifications.js`) were first built. Companion to
[[backtest-findings]] (the earlier, market-only backtest) — same walk-forward discipline, applied
to the new three-sensor gate-then-vote design instead of a single proxy rule.

## THE HONEST HEADLINE: THERE IS NOT ENOUGH HISTORY TO BACKTEST THIS YET
Real backtesting needs real past decisions and real past outcomes. Two of the three sensors this
algorithm reads have **no history older than tonight**:
- FOMO signals: `fomonotifications.js` started reading Connal's Mac's notifications tonight.
  There is no earlier record — the notification database only holds what the OS has not yet
  discarded, and nothing before this feature existed was ever captured.
- Social readings for these specific coins: `sector.jsonl`'s ticker list is a rolling snapshot, not
  a stored history per ticker.
∴ ! this is the SAME finding as [[70-AREAS/social-collection/LOG]]'s "the labelled outcome record
does not exist at all, n=0" from 09-01, one level up: a real backtest of the ADMISSION algorithm
cannot be built retroactively. It can only be built by letting tonight's recording keep running
and checking it again once real history exists. Nothing below should be read as a performance
claim — it is a proof the walk-forward MECHANISM has no lookahead, using whatever real data exists.

## A REAL, STRUCTURAL GAP FOUND WHILE TRYING: A WHOLE CHAIN HAS NO FREE HISTORY SOURCE
Several of tonight's real FOMO signals (SLINK, PONS) are on a chain DexScreener reports as
`"robinhood"`. Checked GeckoTerminal's own `/networks` list directly (100+ entries, paged) — no
such network exists there at all. ! this is not a code bug: `adapters/geckoterminal.js` was made
chain-aware today specifically to test this (previously hardcoded to `networks/solana/...`,
silently wrong for anything else), and the fix still cannot produce history GeckoTerminal itself
does not index. ∴ for any coin on this chain, there is currently NO free historical price source
this project can reach — not a gap in this project's tooling, a gap in what exists for free. Worth
knowing before assuming the chain-aware fix solves multichain backtesting generally; it solves it
for every chain GeckoTerminal covers (confirmed: eth, bsc, base, solana, and ~96 others), not this
one.

## WHAT COULD ACTUALLY BE CHECKED, AND WHAT IT SHOWED
Of tonight's real candidates, only **MarsCoin (BSC)** has a real, fetchable historical price series.
- fact: Aurelius0121 (a followed trader) sold MarsCoin 22 times over roughly two hours tonight,
  net zero buys from anyone followed in the same window. `admission.evaluateCandidate()` correctly
  rejected it on the sell gate every single time it was evaluated.
- fact, checked against real BSC hourly candles: over that same window, price moved from ~$147.86
  to ~$147.30 — essentially flat, mildly rolling over — immediately AFTER a much larger prior run
  (the coin's 24h change was +52% at the time this was checked, meaning the big move happened
  earlier in the day, not during the selling window itself).
- ∴ the honest read: rejecting MarsCoin kept the algorithm out of a coin that had already run hard
  and was topping out while someone who follows it closely quietly sold into that plateau. That is
  the gate doing exactly what it is for — not proof the RULE is good (n=1), but proof the MECHANISM
  produced a sensible, checkable answer on a real case, which is what tonight can actually offer.

## THE OTHER REAL CHECK, ALREADY REPORTED, RESTATED HERE FOR THE RECORD
SLINK had 13 different followed traders genuinely buying it and was correctly rejected anyway for
lacking a second confirming sensor. Checked against DexScreener's own price-change fields
afterward: SLINK's 1h change was **-92.44%**, immediately after a +9496% six-hour spike. Real,
checkable, and it is the strongest evidence tonight that "many buyers is not enough alone" is the
right call, not an overcautious one — this is what a pump immediately unwinding looks like, and the
algorithm never admitted it.

## WHAT AN ACTUAL BACKTEST NEEDS, GOING FORWARD
1. Keep `fomonotifications.js` running (it already is, every 10 minutes, while the Mac and app are
   open) — this IS the recording starting. It cannot be backdated; it can only accumulate from now.
2. The same n>=50 discipline as everywhere else in this project (D-05) before any hit-rate or
   return number from this algorithm is treated as meaning anything.
3. For coins on chains GeckoTerminal does not index, price-outcome checking will need to fall back
   to DexScreener's own point-in-time change fields (coarser, no full candle series) rather than a
   proper walk-forward OHLCV backtest — a real, standing limitation, not a todo to silently forget.
