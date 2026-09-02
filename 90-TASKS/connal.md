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
- [ ] T-018 P1 @connal · two alert tests have been failing since the $1,000 change · why: the
      fixture still uses $10,000→$5,000, both above the new cut-off, so the alert correctly does
      not fire and the test calls that a failure. ! a suite that always shows red trains you to
      ignore red, which is how a REAL break gets through · [[decisions]] D-114
- [ ] T-017 P3 @connal · FIRST · work out what whale wallet tracking watches and what a move MEANS
      · why: everything below is blocked on it. "track whales" is not yet a spec — which wallets,
      and whether a whale selling is even bad news, are both unanswered. ! D-93: no free keyless
      RPC reads a wallet from a datacenter, so anything always-on needs a home that is not the
      alert worker · [[80-WHISPERS/whale-tracking/README]]
- [ ] T-016 P3 @connal · THEN · the combined system: whale moves + social + market numbers, scored
      together, picking which coins to track — and the resulting analysis shown BOTH in the app and
      in notifications · why: Connal, 09-01, on it being extremely important: "it synthesizes the
      data from the other two and actually picks which coins to be tracking and comes up with an
      analysis based on those 3 data points which is portrayed to me in app and in notifications"
      · ! D-117: no part of this ships without a surface · [[60-KB/watchlist-admission-research]]
- [ ] T-011 P1 @connal · find out whether "3 credible people mentioned this coin" actually predicts
      anything · why: the collector now spots these, but nobody has shown they mean anything. the
      research says be sceptical (models that fit beautifully then fail). without a record of
      predictions vs outcomes, a good week is indistinguishable from luck — and it's the number
      that would decide how much money goes in · [[70-AREAS/social-collection/README]]
- [ ] T-012 P1 @connal · check the manipulation detector actually fires · why: it flagged 3 of 376
      readings and reads 0% bots most of the time. for memecoin twitter that's hard to believe, and
      a detector that never fires looks identical to one that isn't running
      · [[70-AREAS/social-collection/README]]
- [ ] T-002 P2 @connal · make the Cloudflare token so the app can send your holdings by itself
      · why: right now I typed your coins in by hand — buy a new coin and the alerts won't know
      about it · [[cloudflare/telegram-alerts/README]]
- [ ] T-001 P1 @connal · check how often the alert check gets blocked and misses a turn
      · why: it can quietly stop watching your coins and look completely fine while doing it
      · [[decisions]] D-94

## CLOSED TODAY
- [x] T-019 · "coins keep disappearing from the watchlist" — NOT A BUG. Connal removed ANSEM and
      LaPeace himself. ! keeping the row: I restored both, twice, and reported his own deliberate
      action back to him as a suspected fault. The lesson is the cheap check I skipped — ASK before
      reversing a change that looks like data loss. A removal and a bug look identical in a diff,
      and only one of them has a person behind it. Both are now removed again.

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
