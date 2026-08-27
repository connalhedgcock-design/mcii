---
id: tpl.thesis
t: tpl
v: 1
---
# THESIS TEMPLATE — ! no position logged without all fields. blank field = thesis rejected.
---
tkr:
chain:
ca:              # ! contract address. REQUIRED. ticker alone is not an identity.
opened:
size_pct:        # % of total crypto stack, not $
cost_basis:
---
## 0 SAFETY GATE  (must pass before anything below is written)
- mint_auth_revoked: y/n
- freeze_auth_revoked: y/n
- lp_burned_or_locked: y/n  (until:)
- top10_ex_lp_pct:
- creator_hold_pct:
- pool_depth_usd:
- exitable_at_5pct_slip_usd:   # ! the real position size
- honeypot_sim: pass/fail
- VERDICT: PASS / FAIL  ! any CRITICAL fail > no position. not negotiable.

## 1 THESIS  (them)
- claim:
- mechanism:        # WHY does this make price go up. "people will notice it" is not a mechanism.
- horizon:
- conf: __%

## 2 ANTITHESIS  (! written by CLAUDE, not by the holder)
- strongest bear case:
- who is on the other side of this trade and why are they selling to us:
- the observable that would confirm the bear case:
- base rate this thesis must beat (see [[base-rates]]) and HOW it beats it:

## 3 SYNTHESIS
- resolves to SIZE + EXIT, not to conviction.
- size_pct: ____  ∵
- invalidation trigger (price/onchain/social, must be OBSERVABLE + AUTOMATABLE):
- time stop:        # exit if thesis hasn't played out by this date, regardless of price
- pre-committed take-profit:
- ! written before entry. changing it after entry = logged as a violation in 50-LOG.

## 4 RESOLUTION  (filled at exit)
- outcome:
- was the mechanism right, or did we get the right answer for the wrong reason:
- brier contribution:
