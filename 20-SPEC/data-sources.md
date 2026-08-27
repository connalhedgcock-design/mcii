---
id: spec.data
t: spec
v: 1
upd: 2026-08-23
---
# DATA SOURCES — costed against the $20/mo cap
verified 2026-08-23. ! re-verify quarterly; API pricing in this space churns hard.

## TIER 0 — FREE, NO KEY  (build on these first)
| src | gives | limits | note |
|---|---|---|---|
| DexScreener | pairs, price, vol, liq, txns | free, no key, ~300rpm pairs / ~60rpm profiles | ! 9 endpoints, NO history, search capped 30. ToS: no competing product. |
| GeckoTerminal | OHLCV **history**, pools | free, ~30rpm | ✓ fills DexScreener's history gap. this pairing is the backbone. |
| RugCheck | 20+ solana safety signals | free | ✓ powers the P1 safety gate. |
| GoPlus Security | multi-chain token security | free tier | ✓ second opinion / non-solana chains. |
| Jupiter | solana quotes + routing | free | ✓ **exact slippage sim** = exitable-value number. |
| Kalshi | markets, orderbook, candles, trades | free, no auth for reads | CFTC-regulated. |
| Polymarket (Gamma/CLOB) | markets, prices | free, no auth for reads | reads unauth; trading needs wallet. |
| CoinGecko | majors price/mcap | free ~30rpm, ~10k calls/mo | BTC/SOL context = their real beta. |
| Coinbase public | spot price majors | free | ! does not list microcaps. majors only. |
| RSS / news | grounded, low-hype text | free | ✓ counterweight to social. see [[scoring]] NEWS. |
| TradingView **widget** | charts (UI only) | free, sanctioned embed | ! widget ≠ data API. no scraping their feed. |

## TIER 1 — CHEAP, INSIDE CAP
| src | gives | price | budget |
|---|---|---|---|
| twitterapi.io | X posts/profiles/search | ~$0.00015/read (~$0.15/1k tweets) | **$10/mo ≈ 66k tweets** ✓ primary social feed |
| Apify (free plan) | TikTok/IG public post scrape actors | ~$5/mo free credit | $0–5 ✓ trickle only, v2. see G-04 |
| Reddit API | posts/comments | **free** non-commercial, 100 QPM | $0 ! manual app approval since late-2025 — APPLY EARLY, lead-time item |

## TIER X — KILLED BY BUDGET  (keep the receipts, don't re-propose)
- X official X/Twitter API — pay-per-use ~$0.005/read > $20 = ~4k reads/mo (~130/day). unusable. legacy $200 Basic closed to new devs.
- X Grok Live Search — ~$5/1k req + ~$25/1k sources > ~800 sources/mo at cap. and it's *the same X data* twitterapi.io sells ~166x cheaper.
- X Reddit commercial tier — ~$0.24/1k calls + manual contract, enterprise ~$12k/mo. only relevant if this ever monetizes. it must not.
- X Birdeye paid, Moralis paid, Helius paid — good products, all break the cap. revisit only if budget changes.
- X TikTok Research API — academic-institution gated. not obtainable.
- X Instagram Graph hashtag search — deprecated for non-partners. not obtainable.

## LLM / SENTIMENT COST  ! the decision that keeps this free
- do NOT call a metered LLM API per-post. 66k posts/mo through any paid model blows the cap alone.
- ✓ two-stage:
  - stage 1 CHEAP LOCAL: lexicon+rules (VADER-class, crypto-tuned) on 100% of posts. $0. handles volume.
  - stage 2 CLAUDE CLI: only on (a) daily per-token digests, (b) posts stage-1 flags as high-impact/ambiguous, (c) user questions. runs through the existing Claude Code subscription = $0 marginal.
- ! must build a crypto lexicon override: "rug","jeet","bags","ngmi","exit liquidity","dev sold" are strongly negative and generic sentiment models score them ~neutral. this is the difference between a working score and a broken one.

## PROVIDER ABSTRACTION  ! non-optional
- every source behind `SourceAdapter{ fetch(), normalize(), cost(), health() }`.
- ∵ twitterapi.io is a 3rd party operating at X's sufferance and can die overnight. so can any free tier here.
- ✓ every record stores `source`, `fetched_at`, `cost_units`. running $ spend is displayed IN-APP w/ a hard monthly cutoff at $20 that disables paid adapters and falls back to free tier. spending must never be a surprise.

## ADAPTER GOTCHAS — found in live use 2026-08-24, bake into DexScreenerAdapter
- ! `/latest/dex/tokens/{ca}` intermittently returns `{"pairs":null}` under repeated calls (not an error code, a null body). MUST null-check + retry, never treat as "token delisted".
- ✓ `/token-pairs/v1/solana/{ca}` proved reliable under the same load. prefer it; keep the other as fallback.
- ! python urllib default User-Agent gets HTTP 403. set an explicit UA on every request.
- ! response includes pairs where our token is the QUOTE side. filter `baseToken.address == ca` or liquidity totals are wrong.
- ! pool count is unstable (3 > 30 in 24h). never cache pool lists; re-enumerate each poll.
