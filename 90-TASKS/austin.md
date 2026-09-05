---
id: task.austin
t: task-queue
v: 4
upd: 2026-09-05
machine: connal
owner: austin
---
# AUSTIN — queue

Lane (D-89): the app itself — bugs, new rooms/features, UI, the Observatory, Electron/renderer.

Add tasks as plain lines anywhere below; ids and priorities get assigned on the next pass.
! seeded 2026-08-31 from a session on Connal's machine — Austin has not seen or agreed these yet,
so treat the ordering as a proposal, not an assignment.

## NOW
- [ ] T-036 P2 @austin · you're setting up following + notifications for Elon/Trump on your own X
      account (Connal's is suspended) — once that's done, this project wants to read those
      notifications locally off YOUR Mac, the same way it already reads FOMO's trade alerts off
      Connal's (`app/main/adapters/fomonotifications.js`). That needs its own explicit yes from
      you: it means granting Full Disk Access to the Claude desktop app on your machine, which is a
      standing, broad grant (sees every notification your Mac has ever shown, not scoped to one
      app — Connal was told this plainly before agreeing to it on his own machine). Say yes/no
      before anything reads your notification database · why: the mechanism only sees a
      notification on whichever Mac's browser is actually logged into that account
      · [[60-KB/news-catalyst-research]]
- [ ] T-003 P2 @austin · `app/.env` is never actually read — the project has no `dotenv` dependency,
      so `CLOUDFLARE_KV_TOKEN` (and any future local secret) silently does nothing unless exported
      in the shell first · why: `alerts-push.js` looks wired up and correct, and quietly no-ops.
      exactly the silent-plausible-failure shape this project keeps getting bitten by (D-85)
      · `app/main/alerts-push.js`, `.env.example`
- [ ] T-004 P2 @austin · put `CLOUDFLARE_KV_TOKEN` on Austin's machine too
      · why: without it his app never pushes holdings, so whichever machine last opened the
      portfolio silently decides what the alerter watches · [[cloudflare/telegram-alerts/README]]

## NEXT
- [ ] T-009 P3 @both · collect chart history while both laptops are closed — the cloud collector
      still never calls `fetchHistory`, so real candles only accumulate when a coin is open on
      screen · why: no history means no way to analyse how a coin behaved overnight
      · ! scope (which coins, how often) is Connal's call — data question. the build is app/collector
      side. check GeckoTerminal's ~30 req/min ceiling against whatever list size is chosen.
      · ✓ PARTIAL FALLBACK BUILT 09-05: `shared/chartfallback.js` turns the snapshots already
      collected every cycle into the same shape real candles use, wired into `tokens:refresh` as
      `out.historyFallback` — a real point every ~30min even overnight, honestly labelled
      `synthetic: true` since it's one price reading, not a real aggregated candle. Use it when
      `out.history` is thin/empty; never present it as the real thing on screen.
      · [[70-AREAS/trading-strategy/README]]
- [ ] T-020 P3 @austin · a real screen for why the picker admitted or rejected a coin —
      `app/shared/admission.js` already returns `reasons`/`evidence` (which sensors voted, why a
      gate failed) and nothing in the app shows it yet · why: D-117 requires this analysis reach a
      screen, not just a data file — "an improvement nobody can see is indistinguishable from one
      never made" is D-117's own wording · [[app/shared/admission.js]], [[decisions]] D-117
- [ ] T-021 P3 @austin · wherever wallet buy/sell activity reaches a screen, show what
      `app/shared/washtrade.js` flagged, not just a raw count · why: some of that activity is
      manufactured (same wallet trading with itself, or wallets funded from one source pretending
      to be separate buyers) — a raw number would show him fake interest as if it were real
      · [[app/shared/washtrade.js]], [[80-WHISPERS/whale-tracking/README]]
- [ ] T-026 P3 @austin · show the untracked-coin trend list on screen. Connal, 09-05, wants it
      visible now even though it's unproven — real data: `app/tools/find-trending-candidates.js`
      ranks coins we're not tracking by price move + how consistent that move was.
      !! MUST be shown as an unproven observation, not a score that implies it works — a
      same-night walk-forward test (`[[60-KB/trend-candidate-walkforward]]`) found the metric does
      NOT reliably predict what a coin does next (the 3 best-tested coins scored ~zero; the ones
      that looked significant were the least-tested, the signature of noise, not signal). Label it
      something like "coins moving — unproven" rather than a ranked leaderboard, same spirit as how
      manipulation flags are shown as flags, never verdicts · why: showing a raw ranked list would
      read as "the algorithm found these," which the evidence does not support yet
      · [[app/tools/find-trending-candidates.js]], [[60-KB/trend-candidate-walkforward]]
- [ ] T-028 P3 @austin · a screen for news, TWO SEPARATE SECTIONS not one merged list
      (`data/news.jsonl`, field `kind`: `catalyst` vs `crypto`):
      1. per-coin real-world story matches (DOGE-1's the only one so far — the real Dogecoin-funded
         rocket mission it borrows the name of). Real find already in the data: recent headlines
         suggesting that mission may be close to launching. !! MUST be worded as "news about the
         story this coin's name references," never "news affecting this coin" — the coin has no
         actual connection to the real thing, just a documented history of traders reacting when it
         makes news (`[[60-KB/news-catalyst-research]]`'s own explicit UI-wording requirement).
      2. general crypto-market headlines (4 outlets), flagged separately if one happens to mention
         a tracked coin.
      3. `kind: 'self-name-candidate'` rows — a coin's own name searched in the news, UNCONFIRMED
         by construction (`confirmed: false`). !! NEEDS A YES/NO CONTROL, not just a display —
         proven live that this pillar returns real articles about a totally unrelated thing with
         the same name (Cate Blanchett for CATE, a Hugging Face robot for microduck) as often as it
         returns something real (BONER's actual Hims & Hers connection). A person must be able to
         confirm or dismiss each one, same shape as the existing "identified tickers" review flow.
      · why: a real, working signal with nowhere to see it, same problem as T-020/T-021/T-025/T-026
      · [[app/main/adapters/newsfeed.js]], [[60-KB/news-catalyst-research]]
- [ ] T-041 P2 @austin · show the growth-quality read on each coin — `mcii.growthQuality()` returns
      one of: real-looking-growth / price-up-nobody-arriving / crowd-leaving-whale-staying / mixed,
      with a plain-English `why` already written for display. Refreshed every collection cycle.
      ! word it as what ALREADY HAPPENED, never a prediction, and show `unknown` honestly for
      non-Solana coins (no holder data exists there) rather than hiding them · why: this is
      currently the single most informative read this project has — only 1 of 17 coins with holder
      history shows real growth, and it flags coins Connal actually holds
      · [[60-KB/market-manipulation-research]]
- [ ] T-038 P3 @austin · `admission.js` now returns a `tier` (`red`/`yellow`/`green`) alongside
      `admit` — 'yellow' is the middle state Connal asked for (cleared every safety/liquidity gate,
      real evidence exists, just not enough of it to admit). Show it as a yellow indicator with the
      specific reason attached (D-119) wherever a coin's status is shown, not just admitted coins
      · why: right now 'yellow' coins are invisible even though real evidence exists on them
      · [[app/shared/admission.js]]
- [ ] T-025 P3 @austin · a dedicated screen for the wallet tracker itself — not just flags bolted
      onto other views. Connal, 09-05: "we need a screen itself to show the wallet tracker also."
      Data already exists to show: who's actually been trading a coin (`walletflow.js`), which of
      that is flagged as fake (`washtrade.js`, T-021), and — once built — whale sell/buy detection
      (`80-WHISPERS/whale-tracking/README` build-order steps 3-5, not done yet). · why: this is a
      whole real data source with nowhere to look at it; same "no surface = doesn't exist" problem
      D-117 already names for the combined algorithm · [[app/main/adapters/walletflow.js]],
      [[app/shared/washtrade.js]], [[80-WHISPERS/whale-tracking/README]]

## DONE
_nothing yet on this board._
