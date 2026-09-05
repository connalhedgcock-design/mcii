---
id: task.connal
t: task-queue
v: 3
upd: 2026-09-05
machine: connal
owner: connal
---
# CONNAL — my queue

Lane (D-89): scanner effectiveness · what the data MEANS · analysis + scoring algorithms.

**Just type a new line anywhere below. Plain english, no format.** I'll give it an id, a priority
and a spot on the board next time we talk.

## NOW
- [ ] T-039 P2 @connal · 3 test files fail and were never flagged before (`history.test.js` x1,
      `importance.test.js` x3, `sweep.test.js` x3) — confirmed pre-existing (failed identically
      before tonight's changes too, not something just broken). `sweep.test.js`'s look like the
      same stale-fixture shape as T-018 (asserting an old budget/rate a real config change already
      superseded) — not dug into further · why: a suite with unexplained red trains you to ignore
      red, same reasoning as T-018
- [ ] T-037 P1 @connal · `candidates.jsonl`'s scanner path can record an impossible price (found
      09-05: STONK logged as $269.64 for one reading, sandwiched in an otherwise smooth ~$0.02
      series — same shape as D-117's stablecoin bug, just on a different ingestion path D-117's fix
      never covered) · why: anything that reads price off `candidates.jsonl` (trend scoring, wallet
      derivation) can be fed a fake +1,449,410% move and act like it's real
      · [[80-WHISPERS/whale-tracking/README]]
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
- [ ] T-011 P2 @connal · CHECKED 09-05, promising but not trustworthy yet: 23 "emerging" tickers
      matched to real price history, 62% hit their profit target before their stop (n=21 resolved).
      Real, but n is small, one real entry-timing bias risk found and not yet fixed, and the
      biggest win (BIKETYSON +333%) is the only one spot-checked against a second read so far
      · [[60-KB/emerging-signal-backtest]]
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
- [ ] T-023 P4 @connal · re-check the trend-candidate score once more scan history exists, esp. for
      fone/OTC/STONK · why: real walk-forward test run 09-05
      (`[[60-KB/trend-candidate-walkforward]]`) found the consistency score does NOT reliably
      predict a coin's next move — the 3 best-sampled coins scored ~zero, the ones that looked
      significant were the LEAST-sampled (the shape of noise, not signal). Answered for now: does
      not feed the algorithm. Demoted to P4 — nothing to act on until more data exists
- [ ] T-027 P2 @connal · IN PROGRESS · separate "hype burst" posts from "real-world story" posts
      · why: the real-world-story half is now BUILT — `app/main/adapters/newsfeed.js`, a coin's own
      documented real-world story (person-set `newsQuery`, DOGE-1 only so far) checked against
      Google News. Real find already: headlines suggesting the actual rocket mission may be close.
      Still open: separating hype-burst SOCIAL posts (Twitter) from this — the social side of the
      split isn't built yet, only the news side · [[60-KB/news-catalyst-research]]
- [ ] T-024 P4 @connal · once the social record is a lot longer, check whether how hard Twitter
      itself is pushing a post (not just who posts) lines up with coin growth · why: your own idea,
      09-05 — today's sample is too short for this; the 56-test social sweep the same night showed
      how easily a short sample invents a fake pattern, so this needs real time to build up first
      · [[60-KB/social-signal-backtest]]

- [ ] T-029 P4 @connal · decide whether real-time Elon/Trump post-tracking is worth new spend
      · why: MCII watches SEARCHES not ACCOUNTS — watching a specific person in real time is a new
      query competing for the same $24/mo social budget (Truth Social has no free source at all).
      The free version (news coverage of a viral post, once it's newsworthy) already runs today
      · [[60-KB/news-catalyst-research]]

- [ ] T-032 P2 @unclear (was @connal, now needs Austin too) · Elon/Trump tracker — your X account
      is suspended, so Austin is doing the follow/notification setup on his own account instead.
      ! that moves WHICH MACHINE this has to run on: the local-notification trick only sees what
      arrives on the Mac whose browser is logged into that account — that's now Austin's Mac, not
      this one. He needs to open x.com, allow notifications, turn them on for Elon/Trump, and give
      HIS OWN explicit Full Disk Access consent on his own machine — your consent doesn't transfer
      to his computer, same rule `fomonotifications.js` already follows for yours. Not yet asked of
      him · [[60-KB/news-catalyst-research]]

## PARKED
- [ ] T-010 P4 @both · the liquidity alerts have never caught a real crash yet, only a fake one
      I staged · why: worth revisiting after the first real one, to see if the numbers were right

- [ ] T-034 P3 @connal · BUILT 09-05 (`app/shared/calendar.js`, `data/calendar.json`) — seeded with
      DOGE-1's estimated launch window, sourced and flagged as an estimate, never a fact
      · why still open: only one entry exists yet; Austin needs to build the screen for it
      · [[60-KB/news-catalyst-research]]
- [ ] T-035 P3 @connal · BUILT AND LIVE 09-05 (`app/main/pumpcapture.js`) — every real FOMO buy
      signal now starts a real 2h/90s price recording, tested against real data before trusting it.
      Still open: n=0 until real signals fire while it's running; the actual measurement can't be
      answered until that data accumulates · [[80-WHISPERS/analysis-algorithm/README]]

## NEEDS A CALL, NOT WORK  → these belong in [[decisions]], not here
- trading "a few times an hour" — you said yes, 09-05, on the table. ! before I log this as
  reopening D-20/D-36: that rule was about DISCOVERY speed (a laptop can't out-race bots to a
  brand-new pool). Trading MORE OFTEN on coins ALREADY on your tracking list, in response to a
  notification, might not be the same rule at all — worth you confirming which one you meant before
  I write it down as settled either way.

- [ ] T-040 P3 @connal · `washtrade.js` still can't see a 3+ wallet RING (A→B→C→A) — it catches
      self-trades and shared-funding pairs only. The literature names circular trading as a primary
      pattern · why: rings are how a filter this simple gets walked around
      · [[60-KB/market-manipulation-research]]

## DONE
- [x] 2026-09-05 · wash-filter reworked with real research behind it
      (`[[60-KB/market-manipulation-research]]`, `app/shared/marketmanip.js`) — found the 82.8%
      artificial-growth base rate for high-return memecoins, found the literature's own detectors
      can't fire on our data granularity, built one that can (price up + holders flat/down), and it
      flagged one of tonight's own "winners" as likely manufactured
- [x] 2026-09-05 · push-notification question answered with real evidence
      (`[[60-KB/alert-threshold-research]]`) — weak/yellow indicators show in-app, never push
- [x] 2026-09-05 · the admit/reject spectrum is LIVE — `admission.js` returns a `tier`
      (red/yellow/green) from the same gates-then-vote logic, plus a real 4th sensor (confirmed
      news). Tested all 4 cases live · [[app/shared/admission.js]]
- [x] 2026-09-05 · chart fallback built — real snapshot data reshaped into the same format real
      candles use, honestly labelled synthetic · [[app/shared/chartfallback.js]]
- [x] 2026-09-05 · scheduled-dates calendar built and seeded with DOGE-1's real, sourced, flagged-
      as-estimate launch window · [[app/shared/calendar.js]]
- [x] 2026-09-05 · verified tonight's changes introduced zero test regressions (before/after
      comparison via git stash)
- [x] 2026-09-05 · T-012 checked: manipulation detector fires on 30 of 567 recent readings (5.3%)
      — up from the 3-of-376 (0.8%) that prompted the task, consistent with D-104's recalibration
      having taken hold. It does fire now.
- [x] 2026-09-05 · T-033 built, run, and KILLED same day — Connal: "this idea is dumb i dont want
      this." Found a real n=1 repeat-buyer and a real data bug along the way (STONK's fake
      +1,449,410% move, T-037) before being told to stop · [[80-WHISPERS/whale-tracking/README]]
- [x] 2026-09-05 · the labelled outcome record is LIVE — the single most-repeated gap in the vault.
      Every real admission auto-logs a resolvable forecast (`shared/labels.js` + reused `journal.js`
      machinery); resolved automatically each collection cycle against real price history. Tested
      end-to-end against real CATE data · [[70-AREAS/trading-strategy/README]]
- [x] 2026-09-05 · T-030, news filter — self-name candidates now require the headline to actually
      mention crypto. Re-verified live: Cate Blanchett/funeral homes/FDA recall/the robot all gone,
      both real hits (BONER, CASHCAT) survive · [[60-KB/news-catalyst-research]]
- [x] 2026-09-05 · T-031, Robinhood Chain researched — real chain (Robinhood Markets' own L2,
      Arbitrum Orbit, chain ID 4663). Live price already works (DexScreener covers it); the
      historical-candle gap stands (GeckoTerminal doesn't cover it, explorer is Cloudflare-blocked)
      · [[60-KB/robinhood-chain-research]]
- [x] 2026-09-05 · confirmed `curl` is installed on the Hetzner collection host — no longer an
      unverified assumption behind the news feature
- [x] 2026-09-05 · real-world news pillar built (`app/main/adapters/newsfeed.js`) — DOGE-1's real
      rocket-mission story checked against Google News; found real headlines suggesting the actual
      launch may be close · [[60-KB/news-catalyst-research]]
- [x] 2026-09-05 · trend-ranking tool built for untracked candidates — found the record already
      existed (`data/candidates.jsonl`), corrected a wrong claim I'd just logged saying it didn't
      · [[app/tools/find-trending-candidates.js]]
- [x] 2026-09-05 · wash-trade filter built and tested (`app/shared/washtrade.js`) — flags wallets
      trading with themselves or funded from the same source · [[80-WHISPERS/whale-tracking/README]]
- [x] 2026-09-05 · real answer on whether price uptick tracks holders growing, market cap, or
      neither — differs per coin, CATE/DOGE-1 grow with holders, LaPeace didn't
      · [[60-KB/trend-growth-analysis]]
- [x] 2026-08-31 · Telegram liquidity alerts built, deployed and proven end to end (message reached
      your phone) · [[70-AREAS/trading-strategy/README]] · D-91..D-94
