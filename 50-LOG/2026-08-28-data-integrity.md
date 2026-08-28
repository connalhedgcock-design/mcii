---
id: log.20260828
t: log
v: 1
prio: high
---
# 2026-08-28 !! DATA INTEGRITY FAILURE — operator caught it, not me

## WHAT HAPPENED
- operator: "the holder count for cate is not anywhere close to 24k". correct.
- 2026-08-27 17:55 rugcheck reported CATE holders 252,968 > **7,522 in ONE poll**. -97% in ~1 minute.
- it then climbed steadily 7,522 > 24,690 over 17h. that is not a holder count, that is **an index re-scanning from zero**.
- cross-check: jupiter says **116,181**. rugcheck says 24,783. **4.7x disagreement.**
- !! THE APP RECORDED ALL OF IT AS FACT and fired "CATE is losing holders, -90%".
  the alert engine worked perfectly and told them something false. that is worse than no alert.

## ROOT CAUSE — mine, and it is a design failure not a bug
- I took ONE vendor's number as truth with nothing checking whether the value was POSSIBLE.
- I built alerts on top of that number without ever validating the number.
- ! I had already learned this lesson three times in other forms (shared rate limits, per-process budget caps,
  per-person scores) and did not generalise it to DATA. every input needs the same scepticism as every invariant.

## FIX — shared/sanity.js
- checkDelta(): physical-plausibility guard. holders cannot fall >25%/hr — every exit is a transaction,
  a real exodus is gradual. a reading violating that is evidence about the SOURCE, not the token > REJECTED, not stored.
- !! liq is DELIBERATELY UNGUARDED. a liquidity collapse looks exactly like a broken feed and we must always
  err toward showing it. suppressing the one signal that matters most to avoid a false positive would be the worse error.
  tested explicitly: `a liquidity collapse is NOT filtered`.
- crossCheck(): two sources for the same quantity. >1.5x disagreement > show NEITHER as fact.
  ! never average a broken number with a good one — that yields a number that is merely less obviously wrong.
- jupiter adapter now returns holderCount as the second source.
- history.record() guards before writing; rows carry `<field>Suspect` with a reason.
- delta() excludes suspect rows ∴ a broken vendor index can never produce a trend line or fire an alert.

## REMEDIATION OF EXISTING DATA
- quarantined 278 CATE + 299 NEEGY corrupted readings (holders nulled, reason recorded, rows KEPT).
- ! kept rather than deleted: the corruption is itself the evidence for why the guard exists.
- verified after: CATE holders trend +2.2% (n=107), NEEGY -0.9% (n=125), **zero alerts**. false alarm gone.

## TESTS 95 (+9 sanity, written against the real event)

## ! OPEN — the honest state
- we still do not know CATE's true holder count. rugcheck is mid-rescan, jupiter says 116k, no third source consulted.
- ∴ the app now correctly says "sources disagree, showing neither as fact" rather than picking one.
- ? worth adding a third source (solana RPC getProgramAccounts w/ a proper endpoint) to arbitrate. public RPC rate-limited us.

## PART 2 — THE SIGNAL WAS BUILT ON THE BROKEN NUMBER
- ! the corruption was NOT confined to the watchlist. 9 of 38 tokens in the SCANNER's record showed
  implausible holder swings from the same reset — up to **57.7x** (BREAKING 441 > 25,434).
- !! and the accumulation signal — the ONE thing I called a genuinely early, honestly-measured signal —
  took holderGrowth as a required input.
- ! NEAR MISS: during an index rebuild every token appears to gain holders extremely fast.
  that is precisely the shape of "a crowd arriving". we escaped a false signal only because prices
  were not simultaneously flat. that is luck, not design.

## FIX — rebuilt the signal on POOL STATE, not on an index
- ∴ structural insight (which vindicates the operator's earlier "scan based on dexscreener" instinct,
  for a better reason than either of us gave): dexscreener numbers are read DIRECTLY FROM POOL RESERVES.
  holder counts require an index that walks every wallet. an index can silently re-scan itself. a pool cannot.
- accumulating is now: liqGrowth > 3% AND priceGrowth < 15% AND buys/sells > 1.05. all from pool state.
- holderGrowth is ADVISORY ONLY — added to score when trustworthy, never required, discarded outright
  when the implied rate exceeds +40%/hr or -25%/hr.
- ! test proves it: a token whose holders appeared to grow +3,100% during a rebuild is flagged suspect
  and NOT surfaced. and a token with NO holder data at all can still be flagged accumulating.
- quarantined 41 corrupted scan observations across 38 tokens.
- UI: when rugcheck and jupiter disagree >1.5x the card shows a RANGE in warning colour + "sources disagree",
  never a single confident figure.

## TESTS 99

## ! THE GENERALISED LESSON (fourth instance of this shape)
prefer data read directly from the thing being measured over data derived by an index that must
scan the world. pool reserves > wallet indexes. the second kind fails silently and plausibly.
