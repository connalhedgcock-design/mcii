---
id: area.multichain.log
t: area-log
v: 1
upd: 2026-08-29
machine: austin
---
# MULTICHAIN MARKET DATA — log (append-only)

## 2026-08-29 — 1. THE ANSEM IMPOSTOR (search ranked by a claim, not by real trading)
- context: operator added a coin called ANSEM ("The Black Bull") from search results. app reported
  it as $317.7M market cap, 1 pool, 17 holders, top wallet owning 99.93%, safety verdict FAIL,
  $0 sellable before a 5% move, LP unlocked.
- I initially explained this to the operator as a genuine rug-pull risk — accurate ABOUT THE COIN
  THE APP HAD LOADED, but I had not checked whether it was the coin the operator meant.
- operator: "that doesnt make sense. its ansem the black bull. if i go to the fomo/app it has 340m
  and has 136k holders, are you looking at the wrong ansem." — correct, and the better question.
- root cause: `searchTokens()` (`dexscreener.js`) ranked results by raw self-reported
  `liquidity.usd`. an impostor token, same name and ticker, had ONE pool claiming $317M of
  liquidity — trivial to write into a pool's stated reserve without any real trading — which
  outranked the real ANSEM's $7M across 30 real pools with $3.7M/day of genuine volume. the
  impostor sat at the top of search and got added.
- compounding bug: `searchTokens()` also kept only the SINGLE DEEPEST pool per token (`if (liq >
  prev.liquidityUsd)`), which collapsed the real ANSEM's 30 pools down to one and threw away the
  clearest tell available (pool count) before the operator or the app ever saw it.
- verified independently before touching any code: `curl`'d dexscreener's search directly, and
  called `fetchTokenMeta`/`fetchSafety`/`fetchMarket` against BOTH contract addresses side by side.
  confirmed: impostor = 1 pool, 17 holders (RugCheck AND Jupiter agree), $118k/day volume, top
  wallet 99.93%. real = 30 pools, 136,617 holders, $3.7M/day volume, top wallet 49.23%.
- fix (`dexscreener.js: searchTokens`): SUM liquidity/volume across all pools for a token instead of
  keeping only the deepest; rank results by real 24h VOLUME and pool count first, self-reported
  liquidity last; flag (`suspect: true`) any token whose liquidity exceeds half its market cap
  across ≤2 pools — a pool holding nearly a token's whole cap is a deposit, not a market.
- watchlist corrected: swapped the impostor's contract address for the real one, cleared its stale
  cached readings from the sidecar (`~/Library/Application Support/mcii/snapshot.json`).
- verified: real ANSEM now ranks first in search; the impostor doesn't make the top five.

## 2026-08-29 — 2. CASHCAT: "NO MARKET DATA AVAILABLE" FOR A COIN DOING $22M/DAY
- operator: "it says no market data available. why would no market data be available... i dont get
  how you could have market data on coins like CATE and ANSEM but not cashcat... if im running into
  problems with the 3 coins ive tried to add who knows what else ill end up having to deal with."
  a fair objection — this needed a real fix, not a one-off.
- checked the actual sidecar error for CASHCAT: `market data unavailable (token not found in any
  pool)` + `safety check unavailable (HTTP 400)` + `token details unavailable (not found on
  Jupiter)` — three DIFFERENT-looking failures.
- root cause: CASHCAT trades on **Robinhood's chain**, not Solana. `fetchMarket()` queried
  `token-pairs/v1/solana/{addr}` first; for a non-Solana address this returns `[]` — **an empty
  array, not a thrown error** — so the multichain fallback (`latest/dex/tokens/{addr}`), which DOES
  exist in the code, was never reached. confirmed directly: the Solana endpoint returned `[]`; the
  multichain endpoint returned 30 real pairs on `robinhood`, $4.9M liquidity, $22M/day volume.
- second latent bug found in the same function: EVM addresses are case-insensitive; the pool-filter
  compared `p.baseToken.address === ca` with exact string equality, which would silently match
  nothing against a differently-cased but identical address.
- fix (`dexscreener.js: fetchMarket`): fall through to the multichain endpoint whenever the Solana
  call returns EMPTY, not only when it throws; compare addresses case-insensitively; when a token
  appears on more than one chain, keep the chain carrying the larger real market rather than
  summing across chains (summing would invent depth nobody could actually sell into from one
  place). `market.chain` is now returned and stored.
- the three OTHER services (RugCheck, Jupiter, GeckoTerminal) are genuinely Solana-only — no
  fallback exists for them. `main/index.js: loadToken()` now checks `market.chain` and SKIPS them
  with a plain-language explanation (`out.limited`) instead of emitting three cryptic errors per
  off-chain coin. the card and the search-results row both surface the chain and the reason before
  and after a coin is added.
- verified: CASHCAT loads clean — $193.8M cap, $12.1M liquidity, $4.9M/day volume, zero errors,
  with the limited-coverage note correctly set. all three watchlist coins (CATE, ANSEM, CASHCAT)
  confirmed loading with zero errors after the fix.

## THE STANDING RULE THIS PRODUCED
`70-AREAS/mcii-overview/OVERVIEW.md`'s adapter table is the reference for what's Solana-only vs
multichain. Any NEW external service added later must be checked against this before assuming it
covers a coin the app is already tracking on another chain.
