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

- [ ] T-016 P3 @connal · one system that decides which coins to track, reading whale wallet moves
      AND the social tracker AND the coins' own market numbers together · why: right now the three
      never meet. Market data and social each go to their own screen, whale activity does not exist
      at all, and the coin list is whatever either of you typed in by hand. Connal, 09-01: "we need
      to develop a system for you watching combined wallet activity from whales, social media
      tracker data, and the numbers from the coins/market themselves so you can automatically pick
      which coins to be tracking and which not to be." ! BLOCKED on the whale half (T-017) — two of
      the three inputs exist, the third has no mechanism yet. ! design already researched:
      competitive admission + automatic expiry, [[60-KB/watchlist-admission-research]]
      · [[80-WHISPERS/analysis-algorithm/README]]
- [ ] T-017 P3 @connal · work out what whale wallet tracking would actually WATCH and what a move
      MEANS · why: T-016 cannot be built without it, and "track whales" is not yet a spec — which
      wallets, and whether a whale selling is even bad news, are both unanswered. ! D-93 is the hard
      constraint: no free keyless RPC will read a wallet from a datacenter, so anything always-on
      needs a different home than the alert worker · [[80-WHISPERS/whale-tracking/README]]

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
