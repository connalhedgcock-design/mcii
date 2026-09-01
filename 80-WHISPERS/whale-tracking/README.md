---
id: whisper.whale-tracking
t: whisper-topic
v: 1
upd: 2026-09-01
machine: connal
whispers: 1
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

## OPEN `?` — all of it
- `?` which wallets. top holders of a held coin? wallets that bought early on coins that later ran?
  a hand-kept list? ! a hand-kept list goes stale silently, which D-93 already rejected once.
- `?` what a movement MEANS. a whale selling is not automatically bad news and a whale buying is
  not automatically good — both are single data points from an actor whose intent is unknown.
- `?` where it runs, given D-93.
