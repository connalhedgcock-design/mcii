---
id: log.price-signal-integrity-2026-09-07
t: log
v: 1
upd: 2026-09-07
machine: connal
---
# PRICE + SIGNAL INTEGRITY

## RESULT
fact: T-037 fixed across scanner ingestion, desktop reads, live monitoring, forecast resolution,
wallet derivation, short pump captures and phone price alerts. The two real STONK quotes at
$269.64/$310.92 inside its ~$0.02 history are marked suspect and excluded downstream.

fact: consecutive suspect quotes are each checked against the last trusted quote, not against one
another. Otherwise $269.64 could mark $310.92 as plausible and poison the new reference.

fact: downward prices are never suppressed by this rule. A genuine collapse while liquidity holds
is the rug shape MCII exists to catch. The test proves $0.02 -> $0.00001 remains usable.

fact: every generated coin signal now has an append-only record with coin address/symbol, signal
time, observed price + its own observation time, explicit price state (`observed`, `unavailable`,
`stale`, `suspect`), reasons and full evidence. Covered generators: raw FOMO trades, every scan
pass/rejection, accumulation, admission/rejection, continuous rescore, slow desktop alerts, live
desktop alerts, discovery phone alerts and price/liquidity phone alerts. Missing/bad prices remain
null with the raw quote and reason; they are never invented as zero.

fact: desktop/server records use `50-LOG/signals-<machine>.jsonl`, separate per writer to avoid git
collisions. Phone alerts use immutable `signals:<time>:<id>` KV batches written before sending.
A save failure stops delivery and is tested; a muted-by-cooldown phone event remains recorded.

## TEST EVIDENCE
- price/signal integrity: repeated bad quotes excluded; true collapse preserved; four price states
  round-trip from disk; incomplete signals and failed writes rejected; real STONK rows exercised.
- phone integrity: two consecutive bad quotes fire nothing and do not replace the trusted price;
  a true fall saves before sending; a second cooled-down event is still saved; failed save sends
  nothing.
- scan-store: 13/13 passed. journal: 31/31 passed. history price/holder tests pass after preserving
  their requested time window.
- T-018's two alert examples now reflect the locked $1,000 rule. T-039's stale importance and
  spending examples now reflect the current discovery ordering, $24 cap and D-103 depth. The
  complete app test run is green.

## LIVE VERIFICATION — 2026-09-07
fact: production activation complete. GitHub holds the fix; the collection server runs it and its
timer is active; its save script includes `50-LOG/signals-*.jsonl`; Cloudflare phone-alert version
`f7a26afd-516e-400e-bce1-3a75e61c3d0f` is live on the five-minute schedule.

fact: the first server signal record contains 1,421 rows: 1,410 observed prices, 11 honestly marked
unavailable, 0 incomplete. Every row has coin, time, price state and reasoning.
