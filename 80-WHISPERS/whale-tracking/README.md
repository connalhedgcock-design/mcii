---
id: whisper.whale-tracking
t: whisper-topic
v: 1
upd: 2026-09-01
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

### `?` ANSWERED — WHERE IT RUNS
D-93 stands: no free keyless RPC serves `getTokenAccountsByOwner` from a datacenter, so the cloud
worker cannot do this. But the constraint is narrower than it looks:
- reading wallets from a LAPTOP works today (`adapters/wallet.js`, used by the portfolio).
- ∴ ✓ **derivation runs on a laptop or the €4 host with a residential-style path, on a slow schedule
  (daily is enough — a wallet's track record does not change hourly). The derived SET is small and
  can be published to the repo like the watchlist.** The fast path (has this wallet just sold?) is
  the only part needing frequent checks, and it applies to a handful of coins, not the market.
- ! this is a genuine unknown: whether the host's datacenter IP is refused the same way. **Test it
  before designing around it** — one call, five minutes, and it decides the architecture.

### ∴ BUILD ORDER
1. test whether the collection host can read a wallet at all (5 minutes, decides everything below)
2. the wash-trading / funding-link filter — the evidenced half, and it gates everything after it
3. whale SELL detection on held coins → straight onto the alert path (high value, low ambiguity)
4. wallet derivation + out-of-sample persistence test, logged as a forecast BEFORE it is scored
5. only if 4 holds up: the buy signal as an admission tiebreaker in the three-input score (D-117)

## OPEN `?` — all of it
- `?` which wallets. top holders of a held coin? wallets that bought early on coins that later ran?
  a hand-kept list? ! a hand-kept list goes stale silently, which D-93 already rejected once.
- `?` what a movement MEANS. a whale selling is not automatically bad news and a whale buying is
  not automatically good — both are single data points from an actor whose intent is unknown.
- `?` where it runs, given D-93.
