---
id: log.news-discovery-build-2026-09-08
t: log
v: 1
upd: 2026-09-08
machine: connal
---
# NEWS COLLECTION FOR EARLY DISCOVERY — BUILD

Implements D-128 (scope) after Connal's 09-07 Q2 approval ("also try using it to catch new coins
early"). Collection + labeling only — no UI, no admission wiring, per his 09-08 instruction.

## RESULT

fact: `app/main/adapters/newsfeed.js` gets two new pieces.

1. **`collectGeneralNews(watchlist)`** — reads three general (non-crypto) outlets: CNBC Business,
   TechCrunch, Yahoo Finance (all live-checked 09-08, real item counts 30/20/50; MarketWatch's
   public RSS URL is dead and was left out rather than shipped broken). Per Connal's framing, this
   does NOT hunt for coin names — it looks for macro/industry stories that could move the whole
   market (`MARKET_MOVER_KEYWORDS`, a named, revisable heuristic — rates/Fed, SEC/regulation, ETFs,
   AI-chip/data-center capex, broad market shocks). The one exception: if a coin already on the
   watchlist gets named anyway, that's flagged high-priority per Connal's "huge sign" note, but
   still `confirmed: false` — a keyword match can't tell a real story (DOGE-1's aerospace coverage)
   from a coincidence (Cate Blanchett/microduck) any better here than it could there. Pure noise —
   no coin match, no market-mover keyword — is dropped, not stored; these feeds run ~100
   headlines/cycle and most of it is sports/celebrity/real-estate.

2. **`collectCryptoNews()` extended** — crypto-specific outlets (already running) now checked for
   BOTH the market-mover read above AND `$CASHTAG` extraction, per D-128's "crypto sites get both."
   A cashtag for a coin NOT already on the watchlist writes a `crypto-new-coin-candidate` row —
   symbol only, `ca: null`, `confirmed: false`. Deliberately does not try to resolve a ticker to a
   real contract address here — this project's own ticker-collision machinery
   (`resolve.js`/`ticker-collisions.json`) exists because the same symbol maps to many real coins;
   resolving one safely (or letting a person do it) is separate, later work.

fact: `app/main/cloud-collect.js` — `collectNewsEvents()` now also calls `collectGeneralNews()`;
the `news.jsonl` write mapping carries the new `marketMover`/`priority` fields through, and
`confirmed` is checked with `=== undefined` rather than `?? true` so an explicit `confirmed: null`
(the general market-mover rows, which aren't a coin claim at all) doesn't get silently rewritten to
true by the nullish-coalescing operator.

fact: live-tested against real feeds, 09-08. General sweep kept 5 of ~100 real headlines that run,
all genuinely on-topic (Nvidia/AI infrastructure, US-Canada trade war, EU regulatory action on
Oracle, mortgage/interest rates) — the keyword filter is doing real work, not passing everything.
Cashtag extraction correctly pulled `$PEPE`/`$BONK`/`$SOL` from a synthetic test headline and
correctly ignored `$5 billion` (regex requires a letter first). `npm test`: 35+12+9+18 all still
pass, no existing test broke.

## WHAT THIS DOES NOT DO (on purpose)

- Nothing here is wired into `runDiscovery()` or any admission path. A `confirmed: false` row
  cannot safely auto-add a coin without a person looking at it first — same T-030 lesson the
  self-name pillar already learned. That review surface does not exist yet.
- No new UI. Connal, 09-08: "dont display it in the app yet ill give that to austin to handle."
  The data is there (`data/news.jsonl`, filterable on `kind`) whenever that surface gets built.
- `MARKET_MOVER_KEYWORDS` is a guess at what "market-moving" means, built from Connal's own
  example (data centers) plus this project's existing macro categories. It is not proven and will
  both miss real stories worded differently and flag some that turn out to be nothing — that's why
  it's stored as a label on every row, never used to quietly drop anything.

## TOP TRADER TRACKING — STATUS CHECKED SAME SESSION

fact: checked directly, not assumed. `~/Library/Application Support/mcii/fomo-signals/` does not
exist on this Mac at all. `fomonotifications.init()` creates that folder immediately, synchronously,
the moment the app starts (`main/index.js` line 93, unconditional) — so its total absence means the
desktop app has not been (re)started since this code landed, not necessarily a Full Disk Access
problem. Can't tell FDA status until it's run at least once. Next step is on Connal: restart the
app, then this can be checked again for real signals.
