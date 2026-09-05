---
id: whisper.whale-tracking
t: whisper-topic
v: 4
upd: 2026-09-05
machine: connal
whispers: 1
researched: 2026-09-01
---
# WHALE / WALLET TRACKING — the thinking, gathered

!! THIN THREAD — one whisper. Kept as its own folder because it is a distinct piece of
FUNCTIONALITY with no home anywhere else in the vault, not because there is a body of thought here
yet. ! do not mistake the folder for evidence that this is well developed. It is not.

## WHAT THIS PROJECT IS
Watching specific wallets — large holders, early buyers, repeat deployers — and reading what their
movements mean. Distinct from the analysis algorithm: that one reads a COIN's aggregate data, this
reads named ACTORS. It would be a new data source feeding into
[[analysis-algorithm/README|analysis-algorithm]], not a replacement for it.

## THE WHISPERS IN THIS THREAD
- [[../INBOX-connal|w-004]] — "remeber that i need to build a good wallet/whale tracking technology".
  ! that is the entire content. no mechanism, no scope, no trigger stated.

## RELATED, OWNED ELSEWHERE
- [[../analysis-algorithm/README|the unnumbered 2026-09-01 whisper]] — asks whether the system can
  tell when a large trader/whale POSTS. ! that is social-side author weighting, not wallet watching,
  so it is owned by the analysis thread. This thread is about what a whale's MONEY does; that one is
  about what a whale SAYS. Keep the two apart or both get muddled.

## WHAT IS ALREADY TRUE IN THE CODE (checked, not remembered)
- `app/main/adapters/wallet.js` + `main/portfolio.js` already read an arbitrary Solana address's
  token balances on-chain (`getTokenAccountsByOwner`, both token programs merged). ∴ reading ONE
  wallet is solved; this project is about choosing WHICH wallets and what a movement means.
- ! D-93 is the hard constraint: free keyless Solana RPCs refuse `getTokenAccountsByOwner` from a
  datacenter IP. ∴ any always-on whale watcher cannot run in the cloud the way the price alerter
  does. That is the first real design problem this project has to answer, and it is unanswered.
- ! D-97: J7 Tracker cannot supply deployer history. Asked twice, same answer both times.
- ! D-21: no deployer-history build; operators use J7Tracker manually. Whale tracking is adjacent
  to that rejected row — read it before proposing anything, and say explicitly if this reopens it.

## !! THIS NOW HAS A JOB, AS OF 2026-09-01
Connal, verbatim: "we need to develop a system for you watching combined wallet activity from
whales, social media tracker data, and the numbers from the coins/market themselves so you can
automatically pick which coins to be tracking and which not to be."
∴ whale tracking is no longer a standalone wish — it is **the third input to the tracking decision**
described in [[60-KB/watchlist-admission-research]]. The other two inputs already exist. This one
does not, and it is what blocks the combined system (T-016 / T-017).
! that also sharpens the open questions below from "what would we build" into "what would make a
coin worth a slot", which is a narrower and more answerable question.

## THE DESIGN, RESEARCHED 2026-09-01 — answering T-017
Connal made this the priority ("extremely important"). Below is what the evidence supports, what it
does not, and the two questions the whisper left open, answered.

### !! FIRST — WHAT IS NOT CITABLE, SO NOBODY BUILDS ON IT
Searching "smart money wallet tracking" returns almost entirely VENDOR MARKETING — Nansen,
DEXTools, KuCoin, walletfinder, a Medium post. One of them claims "40,509 wallets with >55% win
rate" and "top 200 wallets sustaining 81.5% win rate out-of-sample". **No paper, no method, no
sample definition, and the vendor sells the product the number justifies.**
- ! treat all of it as UNSOURCED. It is the same shape as the "78–85% accuracy" claim already
  quarantined in [[60-KB/signal-architecture-research]], and exactly the grifter-parroting
  [[base-rates]] warns about ("do NOT tell them 73% of traders are profitable").
- ∴ ! **the premise that wallet skill persists is UNPROVEN for us and must be tested, not assumed.**
  It is also the load-bearing assumption of this entire feature. `est:` conf 45% that a
  usefully-persistent set of wallets exists at memecoin timescales. That is below a coin flip's
  worth of confidence in the thing we are about to build, and it should be said out loud.
  ! this does not mean do not build it. It means build the MEASUREMENT first: derive a wallet set
  from one period, then score it out-of-sample on a later one, and log that as a forecast before
  looking (D-05's discipline, applied here).

### WHAT *IS* SUPPORTED — the anti-gaming half, and it is the well-evidenced half
- fact @Victor & Weintraud, *Detecting and Quantifying Wash Trading on Decentralized Cryptocurrency
  Exchanges* (WWW 2021, arXiv 2102.07001): wash-trading structures **consist mainly of one or two
  accounts**, and **self-trades occur frequently**. On both exchanges studied, **>30% of all tokens
  showed wash trading**, and ~10% of tokens on one were almost exclusively wash traded.
- fact @same: colluding addresses are linkable because they **must be funded for gas**, leaving
  direct or indirect transfer links — this is the basis of address clustering / entity recognition.
- fact @*Exposing Stealthy Wash Trading on AMM Exchanges* (ACM TOIT, 2024): the AMM setting has its
  own stealthier patterns, i.e. the naive detectors do not transfer unchanged.
- ∴ ✓ Connal's own instinct is the evidenced one: **on-chain does not mean honest.** A third of
  tokens carrying fake volume is not an edge case, it is the base rate. ∴ the wallet layer needs a
  manufactured-vs-real check BEFORE it needs a smart-vs-dumb one — same ordering the social side
  arrived at, for the same reason.

### `?` ANSWERED — WHICH WALLETS
! **derived, never hand-kept.** A curated list goes stale silently, which D-93 already rejected
once for exactly this project ("goes stale silently, exactly when a new coin is most likely to rug").
Derivation, in order, all computable from data they already have or can get:
1. take coins in their own record that did something notable (a real move, not a launch)
2. find who was holding before it moved
3. **discard any wallet linked to the coin's creator or funded from the same source** — the gas-link
   heuristic above. A "successful early buyer" who was funded by the deployer is an insider or a
   sockpuppet, and counting them as skill is how the whole thing becomes noise.
4. **require repetition across DIFFERENT, unrelated coins.** One hit is luck at these base rates
   ([[base-rates]]: ~0.26% graduation, the money is a thin tail). ! a wallet qualifies on a pattern
   across coins that do not share a funder, never on one spectacular trade.
5. cap the set small enough to re-derive cheaply, and **re-derive on a schedule** — the same
   expire-by-default rule as the coin list itself ([[60-KB/watchlist-admission-research]]).

### `?` ANSWERED — WHAT A MOVE MEANS. ! THE TWO DIRECTIONS ARE NOT SYMMETRIC.
This is the part the whisper flagged as unanswered and it has a clear answer:
- **A large holder SELLING a coin they hold is a RISK signal, and it is close to unambiguous.**
  Supply hitting a thin pool is the mechanism itself, not a hint about it — w-005's rule exactly.
  It does not matter why they sold; the pool takes the hit either way. ∴ high weight, and it
  belongs on the ALERT path for held coins (D-70).
- **A large holder BUYING is ambiguous and easily manufactured.** It could be conviction, a market
  maker, an airdrop, or a wallet buying its own coin to look bought. Per the wash-trading base rate
  above, manufactured is not the unusual case. ∴ **low weight, admission-tiebreaker only, and never
  alone** — it may help a coin win a tracking slot; it must never trigger a notification by itself.
- ! `est:` conf 75%. falsifier: if, over n>=50, whale buys that passed the funding-link check are
  followed by outcomes no different from coins without them, the buy signal is decoration — delete
  it and keep only the sell side.

### `?` ANSWERED — WHERE IT RUNS. ! MEASURED LIVE 2026-09-02, NOT ASSUMED.
D-93's block is narrower than it first reads. Tested directly from the collection host (Hetzner,
a real datacenter IP) against publicnode:
- `getTokenAccountsByOwner` — REFUSED ("Request blocked"), exactly as D-93 found for Cloudflare's
  worker. This answers "what does this ONE wallet hold" — the portfolio's question, not this one.
- `api.mainnet-beta.solana.com` — worse than a refusal: TCP/TLS connects, the request sends, then
  **nothing comes back**. A silent hang, the same failure shape as D-87's 3h46m freeze. Avoided.
- `getSignaturesForAddress` and `getTransaction` — **both work, fast, real data**, from the same
  host, on the same IP that got refused above. ! wallet tracking needs "who has been trading THIS
  pool", not "what does one wallet hold" — a different RPC method, and it turns out not to be
  blocked. D-93's constraint does not transfer to this file; it only looked like it might.
- ∴ ✓ **the always-on host CAN do this. No laptop dependency, no new RPC key, no new account.**
  `app/main/adapters/walletflow.js` — built and reads pool flow DEX-agnostically via
  `preTokenBalances`/`postTokenBalances` (Solana computes these for every transaction regardless of
  which AMM program ran), rather than parsing pump.fun/Raydium/PumpSwap swap instructions, which
  differ per program and would be a silent-wrong-parsing risk this project keeps hitting elsewhere.

### !! LIVE TEST RESULT, 2026-09-02 — THE MECHANISM IS SOUND, THE HIT RATE IS NOT YET TRUSTED
Ran it against CATE's real pool (`pumpswap`, address `HMzvsE...`), not a mock. Two clean results
came back — a wallet gaining ~325 CATE while the pool lost exactly ~325 (a buy), and the reverse
for a sell, both perfectly symmetric. The mechanism is correct when it fires.
- !! BUT on 20 of the pool's most recent signatures, only 2 produced a detected change. The other
  18 either genuinely moved no CATE balance at that address (a plausible, correct "nothing to
  report") or the extraction is missing something real — **I have not yet separated those two
  cases with confidence**, and reported that honestly rather than claiming a working feature.
- ! `est:` conf 55% that the low hit rate is mostly genuine (net-zero routing transactions, or
  activity on a different token account than the one DexScreener reports as `pairAddress`) rather
  than a bug in the extraction itself — the two hits that DID fire were clean and unambiguous.
- ∴ NOT wired into anything a person sees. No alert, no admission scoring, nothing user-facing
  reads this yet. ! per the same discipline as the wash-trading filter below: shipping an unreliable
  read straight to a screen is worse than not having it, and the hit rate needs real validation
  first — cross-checking recovered flow against DexScreener's own `buys24`/`sells24` totals over a
  longer sample is the concrete next check, not yet done.
- ✓ VALIDATED AND FIXED, 2026-09-02: ran a bigger sample (80 signatures) against the same pool
  address — hit rate held steady at ~28%, confirming the low rate was real and consistent, not a
  fluke of the first 20. Root cause found by testing a second hypothesis: querying signatures
  against the coin's MINT account directly, instead of one specific pool's address, jumped the hit
  rate to 72% on CATE and 40% on DOGE-1 (confirmed on two different coins before trusting it). A
  coin trades through more than one pool/route, and the pool address DexScreener reports is only
  one of them; the mint is referenced by every transfer regardless of route. `walletflow.js` now
  defaults to watching the mint. Still not wired to anything user-facing — next real step is the
  funding-link filter, which this finding was a precondition for trusting enough to start.

### ∴ BUILD ORDER
1. test whether the collection host can read a wallet at all (5 minutes, decides everything below)
2. the wash-trading / funding-link filter — the evidenced half, and it gates everything after it
3. whale SELL detection on held coins → straight onto the alert path (high value, low ambiguity)
4. wallet derivation + out-of-sample persistence test, logged as a forecast BEFORE it is scored
5. only if 4 holds up: the buy signal as an admission tiebreaker in the three-input score (D-117)

## !! STEP 2 BUILT AND TESTED, 2026-09-05 — `app/shared/washtrade.js`
Two signals, both from the Victor & Weintraud evidence above, not invented: (a) a wallet that both
bought AND sold the same coin in one window (self-trade), (b) wallets funded in SOL from the same
source (funding-link cluster) — either flags that wallet's flow as manufactured rather than real.
- ! BOUNDED, NOT EXHAUSTIVE. Finding a wallet's true first-ever funding would mean paging its whole
  history to genesis — expensive, possibly hundreds of calls for one busy wallet. This checks only
  the last 20 signatures per wallet and caps at 12 wallets checked per call (largest-flow-first).
  An owner with no funder found in that window is reported UNCHECKED, never as clean — the honest
  reading is "did not find a link," not "found none exists."
- Tested two ways before trusting it: (1) a synthetic case (one wallet buying then selling) —
  correctly flagged, confirming the self-trade logic fires; (2) a real run against CATE's actual
  pool flow (10 rows, 7 distinct owners) — ran cleanly end to end, 0 flagged, 0 unchecked. The zero
  result is NOT evidence CATE has no wash trading — n=1 coin, small sample, and the funding-link
  check only looked 20 signatures back per wallet. It proves the mechanism runs correctly against
  real chain data without erroring, which is what step 2 needed to prove before step 3 can build on
  it.
- ! STILL NOT WIRED TO ANYTHING A PERSON SEES. Per the same discipline as `walletflow.js` itself:
  an unvalidated wallet read must not reach a screen or alert. Step 3 (whale sell → alert) is the
  next real step and must call this filter first.

## !! STEP 4 BUILT AND RUN, 2026-09-05 — `app/tools/derive-wallets.js`
Follows this file's own derivation method exactly: find coins with a notable real move, find who
was buying via `walletflow.js`, filter out wash/funding-linked wallets (`washtrade.js`), require a
wallet to appear across 2+ DIFFERENT coins before counting it as a real candidate.
- Real run: 7 real Solana movers checked (STONK excluded — see the bug below), **1 wallet found
  buying into 2 different real movers (biketyson +333%, HeeHaw +197%)**:
  `mP4tnNkwAtRLpSZG5CqcH3CVPJHgVw7XH3j6YRyayQP`. Written to `data/derived-wallets.json`.
- ! n=1 candidate is nowhere near enough to trust — same discipline as everywhere else this week.
  This is the mechanism working end-to-end for the first time, not a validated wallet to follow.
  Needs to run repeatedly as more coins move before this list means anything.
- !! REAL BUG FOUND WHILE BUILDING THIS: `STONK` showed a move computed as **+1,449,410%** — not
  real. Checked the raw data directly: two isolated readings of $269.64 and $310.92 sandwiched in
  an otherwise smooth ~$0.02 series. Same shape as D-117's stablecoin-mispricing bug (decisions.md)
  — a bad/wrong-pool quote for one reading — just on `candidates.jsonl`'s scanner ingestion path,
  which D-117's fix (applied to the portfolio price-series path) never covered. `derive-wallets.js`
  now skips anything over +500% as suspect rather than silently trusting it, but the underlying
  scanner bug is UNFIXED — worth its own look before this data is trusted for anything else that
  reads `candidates.jsonl`'s price field.

## X KILLED, 2026-09-05 — Connal, verbatim: "this idea is dumb i dont want this"
Said right after seeing the real n=1 result from step 4 (`derive-wallets.js`). No reason given, not
asked to re-litigate per the mandate's decision hygiene — his call, logged, moving on. Keeping the
receipt (D-69's rule: never delete a rejected idea): the buy-signal / wallet-derivation half of
whale tracking (build-order steps 4-5) stops here. ! the SELL side (a followed wallet dumping a
held coin) and the wash-trade filter itself are UNAFFECTED — this kill is specifically about
deriving a "smart wallet" candidate list, not about wallet tracking as a whole.

## OPEN `?` — all of it
- `?` which wallets. top holders of a held coin? wallets that bought early on coins that later ran?
  a hand-kept list? ! a hand-kept list goes stale silently, which D-93 already rejected once.
- `?` what a movement MEANS. a whale selling is not automatically bad news and a whale buying is
  not automatically good — both are single data points from an actor whose intent is unknown.
- `?` where it runs, given D-93.
