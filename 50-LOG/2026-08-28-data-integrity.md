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

## PART 3 — RESOLVED. THE SOURCES WERE NEVER DISAGREEING.
operator pushed back: "we need consistent accurate holder counts". right — a range you can't act on
is barely better than a wrong number. so I computed ground truth from chain instead of trusting anyone.

## ! MY BUG BEFORE I COULD MEASURE IT
- first getProgramAccounts returned 0 accounts. I queried the LEGACY token program.
- CATE is **Token-2022** (TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb) — jupiter had told me this on day one and I didn't use it.
- ! querying the wrong program returns an empty result that looks EXACTLY like "nobody holds this token". silent and plausible. fifth time today.

## GROUND TRUTH (chain, 2026-08-28)
  CATE   258,731 token accounts | **116,155 holding a balance** | 142,576 empty
  NEEGY   22,826 token accounts | **5,839 holding a balance**   | 16,987 empty

## !! THE RESOLUTION: TWO DIFFERENT METRICS, NOT TWO CONFLICTING ANSWERS
- rugcheck `totalHolders` = TOKEN ACCOUNTS (incl. empty). its pre-reset 252,968 ≈ chain's 258,731. ACCURATE for what it measures.
- jupiter `holderCount` = accounts WITH A BALANCE. 115,994 vs chain 116,155 = **0.14% drift**. ACCURATE.
- ∴ neither vendor was wrong. **I conflated two quantities into one field and then flagged them as disagreeing.**
  my "sources disagree" warning was itself the error. removed.
- (rugcheck's 24,783 IS still broken — that's the index reset, a separate and real fault.)

## ! CONSEQUENCE FOR THE OPERATORS
- NEEGY has **5,839** real holders, not the ~23,000 we had been showing. that is a 4x smaller community than the app implied.
- CATE 116,155, not 252,968.

## FIX
- adapters/onchain.js — ground truth from getProgramAccounts, dataSlice to the amount field only.
  auto-detects token program (legacy vs 2022) ∵ guessing returns a plausible zero.
  also yields top1/top10/top100 concentration computed from actual balances.
- jupiter holderCount is now the live number (cheap, verified 0.14% accurate).
- rugcheck field RENAMED tokenAccounts. it is not a holder count and must never be displayed as one.
- cloud collector runs ground truth DAILY (~60MB, ~6s/token — a calibration, not a poll) and logs drift.
  drift >10% prints a warning that the cheap source no longer deserves trust.

## ! THE LESSON THAT GENERALISES
before deciding two sources conflict, check they are measuring the same thing. "holders" was never defined
anywhere in this codebase, so two correct answers looked like a contradiction. DEFINE THE QUANTITY FIRST.

## PART 4 — HOURLY GROUND TRUTH + HOLDER-CHANGE ALERTS (operator request)
- ground truth now runs EVERY HOUR in the cloud collector, not daily. ~60MB + ~6s per token, measured 15s for both.
- ! runs against a public RPC that owes us nothing. a rejection is EXPECTED occasionally, not a failure:
  falls back for that hour, carries the previous value marked `stale:true`, retries next hour.
  !! never records a fallback as though it were ground truth.
- ✓ two new alerts, both computed on CHAIN (so they cannot be triggered by a vendor index rebuilding):
  - holders-exodus HIGH at <=-8%: "people actually selling out, not a data glitch"
  - holders-surge MED at >=+25%: ! deliberately NOT framed as good news.
    airdrops, wash distribution and bot swarms produce an identical shape to genuine buying.
    test asserts the detail text mentions airdrops — the operator must not read a surge as demand.
- ordinary hourly drift (~1.4%) fires nothing. tested.
- app reads the change from the shared record rather than recomputing: a 60MB query belongs on the
  server, not on a laptop that may be on battery. only surfaced while <6h old.

## TESTS 103

## PART 5 (2026-08-29) — THE FIX ITSELF BECAME THE NEXT BUG, AND WENT UNCAUGHT UNTIL THE OPERATOR
- operator: "'CATE is losing holders. Holder count fell 53.7% over 38 hours (252,283 to 116,808).
  People are leaving, not arriving.' This is incorrect because your comparing 2 different numbers.
  the 252000 is how many people have EVER owned cate not current holders so its incorrect to say
  the holder count dropped 130,000 in the last 38 hours because CATE never had 252000 holders at
  once." exactly right, and exactly the failure PART 3 thought it had closed.
- root cause #1: `history.delta()`/`series()` for the `holders` field take the oldest and newest
  non-null reading in a window and diff them with no idea the FIELD'S OWN DEFINITION changed
  underneath it on 08-28. 252,283 was a real, correctly-recorded pre-fix reading (token accounts);
  116,808 was a real, correctly-recorded post-fix reading (accounts with a balance). Both true,
  never comparable, diffed anyway. same shape as PART 3's "sources disagree" bug, but across TIME
  instead of across vendors -- the fix for one didn't think to guard the other.
- root cause #2, found while fixing #1: `cloud-collect.js: collectMarket()` was never updated when
  `rugcheck.js`'s field was renamed `totalHolders` -> `tokenAccounts` in the PART 4 fix. It has
  been reading `safety?.totalHolders` -- now always `undefined` -- every hour since, writing
  `holders: null` into `data/market.jsonl` for every row. The shared record has recorded ZERO real
  holder counts since the fix that was supposed to make holder counts trustworthy. This is why the
  trend the operator saw had nothing between the two contaminated pre-fix rows and one very recent
  local reading to diff against -- there was nothing else to pick.
- fix: `cloud-collect.js` now reads `meta.holderCount` from Jupiter, same as the live app already
  does, restoring real hourly holder data going forward.
- fix: `history.js` adds `HOLDERS_REDEFINED_AT` (the exact timestamp of the renaming commit,
  ca27b2d, 2026-08-28T15:57:44Z) and excludes any `holders` row at or before it from `delta()`,
  `series()`, and the sanity-guard's own prior-reading lookup in `record()`. A trend can no longer
  span the boundary in either direction. Existing jsonl rows are left as written (append-only,
  never rewritten -- same principle as the PART 1 quarantine) and simply age out of every window
  that matters within a week.
- test added: `test/history.test.js` reproduces this exact incident's numbers and asserts
  `delta()`/`series()` return "not enough data" rather than a fabricated percentage, plus a
  negative control that a genuine post-fix trend still fires normally.
- ! THE LESSON, again, in a form that should have generalised the first time: a fix that redefines
  what a field MEANS must also poison every value recorded under the old meaning, not just correct
  the code path that produces new values. "when did this field's definition last change" is now a
  question worth asking before trusting any diff across a wide time window, not only across
  sources.

## TESTS 106

## PART 6 (2026-08-29, same session) — THE PART 5 FIX WAS ALSO WRONG, WITHIN THE HOUR
- operator restarted the app expecting the alert gone. it wasn't. asked plainly: "are you saying it
  worked and it just wont happen again or should it be gone" -- the right question, and the answer
  was it should have been gone and was not.
- root cause: `HOLDERS_REDEFINED_AT` used the RENAMING COMMIT'S timestamp as the boundary between
  contaminated and trustworthy `holders` rows. That assumes every running process reloads the fix
  the instant git records it. It does not. The operator's own app process was still running the
  PRE-fix rugcheck.js in memory for several minutes after the commit landed, and kept writing the
  contaminated 258,820-style reading with wall-clock timestamps AFTER the cutoff. A timestamp
  cutoff cannot distinguish "written under the old code" from "written under the new code" when
  both can happen on either side of the moment git recorded the fix -- it can only distinguish
  before-the-commit from after-the-commit, which is not the same line.
- ! this is the SAME generalised lesson as PART 3 and PART 5, missed a third time in a row: don't
  trust a proxy for the thing you actually need to know. A commit timestamp is a proxy for "when
  did the definition change everywhere" and it is a bad one, for the same reason a vendor index is
  a bad proxy for "how many holders exist."
- real fix: stopped using any date at all. `history.js` now checks every `holders` reading against
  on-chain ground truth (`data/holders-onchain.jsonl`, already written hourly for the holders-exodus
  alert) and excludes any reading more than 2x off the nearest ground-truth check, in either
  direction, regardless of when it was written. This is immune to the process-restart-timing
  problem because it asks "does this number match reality" instead of "when was this written."
  Verified against the operator's actual local history file: the contaminated 258,820 rows (several
  with timestamps after the PART 5 cutoff) are excluded; the genuine 115,933->116,770 drift across
  74 real readings is kept and correctly reads as a +0.7% change, not an alert.
- when there is no ground truth yet for a token (never checked on chain), the filter is a no-op --
  it must not make trend detection worse than before for a token it cannot yet verify.
- test rewritten (`test/history.test.js`) to reproduce exactly this: a contaminated reading
  timestamped AFTER a hypothetical fix commit, sitting between two genuine ground-truth checks, to
  make sure nobody re-introduces a date-based version of this bug later.
- ! THE LESSON, restated a third time because twice wasn't enough: when a fix depends on "when did
  X happen", ask whether X is observable directly before reaching for a clock. It almost always is
  here -- ground truth existed the whole time and should have been the first idea, not the second.

## TESTS
- `test/history.test.js`: 3 (rewritten from PART 5's version to test ground truth instead of a date)
- full suite: 257 passing, 0 failed, after this change
