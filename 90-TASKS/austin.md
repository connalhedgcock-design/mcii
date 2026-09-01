---
id: task.austin
t: task-queue
v: 1
upd: 2026-08-31
machine: connal
owner: austin
---
# AUSTIN — queue

Lane (D-89): the app itself — bugs, new rooms/features, UI, the Observatory, Electron/renderer.

Add tasks as plain lines anywhere below; ids and priorities get assigned on the next pass.
! seeded 2026-08-31 from a session on Connal's machine — Austin has not seen or agreed these yet,
so treat the ordering as a proposal, not an assignment.

## NOW
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
      never calls `fetchHistory`, so candles only accumulate when a coin is open on screen
      · why: no history means no way to analyse how a coin behaved overnight
      · ! scope (which coins, how often) is Connal's call — data question. the build is app/collector
      side. check GeckoTerminal's ~30 req/min ceiling against whatever list size is chosen.
      · [[70-AREAS/trading-strategy/README]]

## DONE
_nothing yet on this board._
