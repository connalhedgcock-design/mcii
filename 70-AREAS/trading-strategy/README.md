---
id: area.trading-strategy.readme
t: area-readme
v: 1
upd: 2026-08-31
machine: connal
---
# TRADING STRATEGY — designing a tested, data-driven approach; not yet built

## WHAT THIS IS
Connal wants MCII to go beyond "is this coin safe / how much could I sell" into actually helping
pick which coins to buy and when to sell — tested rigorously with simulated (paper) trades first,
using real dollar amounts, before any real money follows. This is a NEW initiative, distinct from
and layered on top of the existing safety/exit analysis. Nothing in this area is built yet except
the infrastructure changes at the bottom of this file. Full conversation log in `LOG.md`.

## !! THE ONE PERMANENT BOUNDARY, ESTABLISHED EXPLICITLY IN THIS CONVERSATION
Claude will never be the one deciding or executing REAL trades, at any point, regardless of paper
track record. This was pushed on directly ("be frank... it would be silly not to give you the
ability to make trades yourself if testing shows good results") and held, with real reasoning, not
just cited as a rule:
- paper results systematically overstate real ones (idealized fills, and the market moves once
  real capital chases a signal that never happened in the backtest)
- a good stretch in something this volatile doesn't separate skill from luck as fast as it feels
  like it should — memecoin variance is large enough that weeks of good results can be pure chance
- **even a fully validated strategy doesn't need Claude holding the trigger** — the right way to
  run a proven rule set is as auditable code a human runs, not an AI's live judgment, because code
  can't be talked into a bad trade or produce a confident-sounding reason for a mistake the way an
  LLM can.
Connal's response: "we can reopen this later we need results either way" — NOT settled forever,
but not casually reopened either. Treat this as D-08-adjacent: permanent until explicitly revisited
by Connal with real results in hand, never assumed away by a future session.

## NEXT SESSION'S FOCUS, PER CONNAL DIRECTLY
"the next chat will be focused on building the part that actually picks coins to buy/sell so lets
focus on that." That is the entry-signal / scoring / candidate-selection algorithm — turning "we
don't know yet" (his answer to nearly every entry-rule question below) into something real,
starting from the data MCII already collects. This is squarely his own stated lane (D-89: scanner
effectiveness, data interpretation, analysis algorithms).

## THE $100 PAPER-TRADING BUDGET
Connal, mid-sentence, before pivoting to asking for this handoff: "right now i am trading with
around total 100$, which is what i want you to do your paper-trading with start with an 100$
budget and split it up into different coins while you are testing." **Not yet designed or built —
he was cut off before we worked out the split.** Use this as the real number once the coin-picking
part exists and simulated positions need sizing. Do not invent a different figure.

## WHAT'S ALREADY DECIDED (from the question framework in LOG.md — read the full detail there)
- Paper trades only, entirely separate from any real venue/wallet action — safe to build freely.
- Exit rule: some combination of target / stop / time limit, varies by coin, with an illiquidity
  override ("get out regardless" if a position can't be exited cleanly). Human has final say on
  real money, always.
- At least two weeks of paper trading before any real money follows a validated rule.
- No sign-off needed between Connal and Austin — each spends their own money independently if they
  choose to act on a validated strategy.

## WHAT'S GENUINELY OPEN — DO NOT GUESS THESE, ASK
- **Entry rule itself** — "we don't know yet" was the honest answer to almost everything here.
  This is THE thing the next session is for.
- **Trading frequency** — Connal wants "a few times an hour" ideally, which directly conflicts
  with an existing locked decision (D-20/D-36: nothing under 2 hours old, no sniping, a laptop
  can't out-speed the bots that win at that frequency). He said "not necessarily" to keeping that
  rule when asked directly — meaning he's open to reopening it, NOT that he's decided to. Surface
  this explicitly before building anything that trades on sub-2-hour signals; don't silently keep
  the old rule OR silently break it.
- **Position sizing / total capital ceiling** — "no limit really trade how you like" was the literal
  answer, which isn't testable as stated. The $100 figure above is the real anchor now; still needs
  a per-trade sizing rule (fixed amount? scaled by confidence?) and a max-open-at-once rule.
- **"Confidence" scoring** — Connal wants trade confidence "determined by you [Claude]". Already
  flagged to him: what Claude can honestly offer is a structured score built from real signals
  (liquidity, holders, momentum across sources), NOT genuine trading conviction — calling it
  "confidence" without an earned track record is the exact false-precision anti-pattern this
  project's mandate already bans ("hype score 73.4 implies accuracy that does not exist"). Any
  scoring built for entry-picking should be framed and computed this way from day one, not
  retrofitted later.
- **Exclusion list** — Connal was open to NOT keeping "nothing under 2h old" and "never chase an
  already-moved coin" for this strategy specifically ("not necessarily we need to just identify
  what we can do with those types of coins"). No market-wide "sit out" condition either — he wants
  it always evaluating. Worth revisiting once real signal work starts, not assumed either way.
- **Validation bar** — his stated falsifier ("lack of consistent profits when the technology is in
  a state where it should be profitable") is circular as written and needs sharpening into
  something a bad stretch can't talk its way around. His stated baseline ("profitable at a
  reasonable expense of capital and time and data") isn't actually a baseline — profitable in a
  rising market proves nothing about whether the STRATEGY did anything. He was shown this
  distinction (the app already computes forecasts-vs-market-vs-coin-flip for the existing
  calibration system) but a real baseline for THIS wasn't chosen yet.
- **Rule-tweaking discipline** — Connal said rules should be "fully tweakable," which is in tension
  with ever getting a clean answer on whether a strategy works (a loss can always be explained away
  as "we'd have changed that by now"). Proposed but NOT agreed: lock a numbered strategy version
  per test window, change between windows with the reason logged — same "decide once, log the
  reopen trigger" discipline the rest of this vault already uses.

## DISCOVERY IS STILL THE NARROW, DOCUMENTED GAP — CONFIRMED LIVE 2026-08-31
Checked the actual code, not assumed from old notes: `screener.js` still only finds candidates
three ways — DexScreener's newest-profile listings, DexScreener's PAID/promoted listings, and
GeckoTerminal's trending-by-volume pools. Nothing independent. This means new candidates are either
too-new-to-judge or already-popular/paid-for/already-moved — exactly the bias flagged as unsolved
weeks ago and still true today.

**A real, buildable path exists and is partly built already**: `shared/resolve.js:
unknownTickers()` + `identify()`, called from `cloud-collect.js: buildSectorRow()`, already finds
tickers that ≥3 DIFFERENT PEOPLE are organically discussing in the social sweep and resolves them
to a real contract address (up to 8 lookups per run, `MAX_LOOKUPS`). Right now the result
(`identified` array) is DISPLAY-ONLY in the "What's happening" tab — it never feeds the scanner's
candidate pool or gets chart history. Closing that loop was being designed when this handoff was
requested. Open questions, none answered yet:
- what bar promotes a resolved ticker from "identified" to "actually tracked" — the same
  minPeople≥3 that triggers the lookup, or does it need to hold up over more than one sweep first?
- does it have to clear the safety gate (mint/freeze/LP) before being trusted enough to track?
- automatic promotion, or surfaced for Connal/Austin to approve first?
- does a tracked-this-way coin ever get dropped if the mentions were a one-off?

## SHIPPED 2026-08-31 (SESSION 2) — TELEGRAM LIQUIDITY-PULL ALERTS
`cloudflare/telegram-alerts/` (worker) + `app/main/alerts-push.js` (app side). That dir's README
carries the ops detail; this is the decision record.

**Mechanism: Cloudflare Workers Cron Triggers, NOT GitHub Actions.** Confirmed with Connal rather
than assumed. GH Actions' scheduler is the thing D-61 / the 08-29 hang proved unreliable, so a
faster GH cron doesn't fix that — it ticks the same unreliable clock faster. Cadence 5 min. (D-91)

**A local background process was proposed by one of Connal's friends and correctly rejected — but
the friend was right about the part they raised.** They pointed out, from real experience running
Telegram bots off a local 8b model, that talking to Telegram needs nothing external: it is one
HTTPS POST to `api.telegram.org`. That is true and this worker does exactly that. Cloudflare is not
there for the *sending*, it is there for the *clock*. Their setup works because their box is always
on; MCII's stated requirement is coverage while BOTH laptops are closed, and a local clock stops
exactly then. Confirmed with them that there is no always-on machine. ! Do not re-litigate this as
"why not just do it locally" — the answer is the closed-laptop requirement, nothing else.

**! HOLDINGS COME FROM THE APP, NOT FROM THE CHAIN — because the worker is not allowed to read the
chain.** Measured live from a Worker 2026-09-01, EVERY free keyless Solana RPC refuses
`getTokenAccountsByOwner`: `api.mainnet-beta` → `403 "Your IP or provider is blocked"` (blocks
datacenter IPs), `solana-rpc.publicnode.com` → `403 "Request blocked"` for that method while
answering `getHealth` 200, drpc → paid-plan-only, ankr → key required. It is an expensive
account-scan call and the free tiers all block it. ! Note the shape of that failure: mainnet-beta
returns a well-formed JSON-RPC error body with HTTP 403, i.e. a refusal that can read as data —
check `.error` separately from status. So the app pushes holdings to KV on every portfolio load and
the worker only prices them (DexScreener does answer Cloudflare). Staleness barely applies: a coin
can only be BOUGHT while a laptop is open. The uncovered gap is a trade made on a phone; the worker
warns after 72h without a push rather than silently watching sold coins.
- Chosen over a free Helius/QuickNode RPC key (rejected: another account) and over a hand-kept coin
  list (rejected: goes stale silently, exactly when a new coin is most likely to rug).

**! THE REPO IS PUBLIC** (`gh repo view` → PUBLIC). Nothing about holdings is committed; it lives in
Cloudflare KV. This was not flagged anywhere in the vault before and applies to any future feature
that needs to know what is held. (D-92)

**Verified working end-to-end**: Telegram send confirmed to Connal's phone; wallet read confirmed
accurate (CATE 296.07 on-chain matched `snapshot.json` exactly); worker priced 5 real positions
(~$60 total) and wrote its baseline.

**! KNOWN WEAKNESS — DexScreener rate-limits Cloudflare's shared egress IPs.** Observed repeated
`429` from the Worker while the identical request returned `200` from the laptop, so this is shared
IP-pool contention, not our call volume (one call per 5 min is nothing). Calls now retry with
exponential backoff, but a lost tick is a delayed alert. ! This is the single thing most likely to
make these alerts quietly unreliable — measure the real hit rate before trusting it, and consider
GeckoTerminal as a fallback price source if it proves bad.

**Not yet proven against a real liquidity crash.** The comparison logic is a port of `live.js`'s,
which is proven in the app, but this worker has not caught a real rug yet.

**Still open**: the app's `.env` is not actually auto-loaded (no `dotenv` dependency anywhere —
`TWITTERAPI_KEY` reaches the collector via GitHub Actions secrets instead), so `CLOUDFLARE_KV_TOKEN`
must be exported before launching the app until that is wired up. Austin's machine needs the token
too, or his app simply skips the push.

## NOT YET BUILT
- **Chart history collection while offline.** Currently `fetchHistory` (GeckoTerminal candles) is
  ONLY called from the live desktop app (`main/index.js`) when a coin is actually open on screen —
  the hourly/twice-hourly cloud collector never fetches it, so no chart history accumulates while
  both laptops are closed. Scope was being discussed ("in between" watchlist-only and the whole
  market) when the conversation pivoted to the discovery-gap question above, which is a natural
  candidate for defining that middle ground — but nothing was finalized. Needs: which coins
  (watchlist + recently-scanned candidates was the working default; discovery-loop coins might also
  belong here now), how often, and GeckoTerminal's own ~30 req/min limit needs checking against
  whatever list size gets chosen.

## SHIPPED THIS SESSION — LIVE ON main, NOT JUST DISCUSSED
- Cloud scan cadence: hourly → twice-hourly (`:12,:42`, `.github/workflows/collect.yml`).
- Social/X budget: $12/mo → $24/mo (`X_MONTHLY_CAP_USD`).
- The project's hard ALL-IN spend ceiling: $20/mo → $30/mo (`10-CTX/constraints.md`) — raised
  explicitly, not silently exceeded by the X change alone.
- All logged as D-90, `50-LOG/decisions.md`. Connal's own words, on the record: "i understand we
  will need more money and am okay with it."
- The holder-ground-truth and ticker-collision checks inside `cloud-collect.js` already gate on
  wall-clock time, not on cron firing count, so they did not need any change for the cadence move.

## READ NEXT
- `LOG.md` — the full conversation, in order, including the exact exchanges behind every decision
  and open question above.
- `10-CTX/ops.md` — the Connal/Austin work split (D-89) this initiative sits inside.
- `50-LOG/decisions.md` D-89, D-90 — the two decisions this conversation produced.
