---
id: task.connal
t: task-queue
v: 1
upd: 2026-08-31
machine: connal
owner: connal
---
# CONNAL — my queue

Lane (D-89): scanner effectiveness · what the data MEANS · analysis + scoring algorithms.

**Just type a new line anywhere below. Plain english, no format.** I'll give it an id, a priority
and a spot on the board next time we talk.

## NOW
- [ ] T-002 P2 @connal · make the Cloudflare token so the app can send your holdings by itself
      · why: right now I typed your coins in by hand — buy a new coin and the alerts won't know
      about it · [[cloudflare/telegram-alerts/README]]
- [ ] T-001 P1 @connal · check how often the alert check gets blocked and misses a turn
      · why: it can quietly stop watching your coins and look completely fine while doing it
      · [[decisions]] D-94

## NEXT
- [ ] T-005 P3 @connal · the thing that actually picks which coins to buy and when to sell
      · why: this is the whole point of the trading strategy, and it's the piece that doesn't
      exist yet · [[70-AREAS/trading-strategy/README]]
- [ ] T-006 P3 @connal · decide what "it worked" actually means before testing it
      · why: "profits when it should be profitable" can't ever be proven wrong, and a rising
      market makes anything look clever · [[70-AREAS/trading-strategy/README]]
- [ ] T-007 P3 @connal · how the $100 splits across coins, and how much per trade
      · why: you said $100 but we never worked out the split — it's needed before any paper
      trade means anything · [[70-AREAS/trading-strategy/README]]
- [ ] T-008 P3 @connal · let coins that real people are talking about actually get tracked
      · why: right now the app spots them and then does nothing with them, so it only ever finds
      coins that are brand new or already popular · [[70-AREAS/trading-strategy/README]]

## PARKED
- [ ] T-010 P4 @both · the liquidity alerts have never caught a real crash yet, only a fake one
      I staged · why: worth revisiting after the first real one, to see if the numbers were right

## NEEDS A CALL, NOT WORK  → these belong in [[decisions]], not here
- trading "a few times an hour" contradicts the locked no-sniping rule (D-20/D-36). You said you're
  open to changing it, not that you have. ! don't let this get silently decided by whatever gets
  built first.

## DONE
- [x] 2026-08-31 · Telegram liquidity alerts built, deployed and proven end to end (message reached
      your phone) · [[70-AREAS/trading-strategy/README]] · D-91..D-94
