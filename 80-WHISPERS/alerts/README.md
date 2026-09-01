---
id: whisper.alerts
t: whisper-topic
v: 1
upd: 2026-09-01
machine: connal
whispers: 1
---
# ALERTS / NOTIFICATIONS — the thinking, gathered

!! THIN THREAD — one whisper, but the whisper is already LOCKED as a decision (D-96), so this
folder exists mainly to record where that came from. The build record lives in
`cloudflare/telegram-alerts/` and `70-AREAS/trading-strategy/`; the thinking lives here.

## WHAT THIS PROJECT IS
What reaches their phones, and what it says when it gets there. Distinct from the analysis
algorithm: that one decides what is true, this decides what is worth interrupting someone for and
how much of the reasoning travels with it.

## THE WHISPERS IN THIS THREAD
- [[../INBOX-connal|w-003]] — a notification must carry a deeper read (social + market, and he named
  J7 tracker) on whether something is an interesting buy/sell, not just a number.
  → **locked as D-96**: every notification carries the analysis — what moved, what the social read
  says, what the market data says, then a call with a confidence number and a falsifier.
  → the J7 half is NOT deliverable: D-97, there is nothing readable there. Asked and answered twice.

## RELATED, OWNED ELSEWHERE
- [[../analysis-algorithm/README|w-005]] — liquidity draining is the present tense, social going quiet is a
  guess. ! that is the ordering rule for what triggers an alert at all, and it is why the liquidity
  alerter was built first.
- D-95 — upward moves ARE reported on any tracked coin, held or not. Connal overruled me on this
  and was right on the substance: reporting upside is analysis, recommending a buy is not.

## OPEN `?`
- `?` how much analysis fits in a phone notification before it stops being read. D-96 says the
  evidence travels with the alert; it does not say how long that may be.
- `?` what the alerter should do when the analysis is thin (n too small, sources disagree). Silence,
  or a flagged alert saying so. ! D-24 says THIN and MANIPULATED are different and must not collapse
  into one word — that distinction has to survive into the notification, and currently is not tested.
