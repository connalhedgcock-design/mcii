---
id: kb.robinhood-chain-research
t: kb
v: 1
upd: 2026-09-05
machine: connal
prio: high
---
# ROBINHOOD CHAIN — what it is, what we can and can't get for free

!! researched 2026-09-05 on Connal's direct instruction, after CASHCAT's news kept mentioning it
and `[[trading-strategy/admission-backtest]]` had already flagged it as a chain with no free
historical price source. Real, verified, not assumed.

## WHAT IT IS
Real: launched July 2026 by Robinhood Markets (the actual public brokerage), originally pitched for
tokenized real-world assets and stocks. What actually took off on it was memecoins, not RWAs.
- **CASHCAT** — the first big token, named after "Cash Cat," the name Vlad Tenev and Baiju Bhatt
  reportedly considered before settling on "Robinhood." ~$254M at the time of this research.
- **PONS** — a meme-coin FACTORY token, the same role pump.fun plays on Solana: where people go to
  launch and gamble on new tokens on this chain. Flipped CASHCAT to become the chain's largest
  token by market cap; Binance Wallet added it to its Alpha tier 09-02.
- Also notable: Goose Token (~$78M), Chump Coin (~$30M).
- Technical: built on the **Arbitrum Orbit** stack (an Ethereum L2 framework), uses ETH for gas.
  **Mainnet chain ID 4663** (testnet 46630).

## WHAT WE CAN ACTUALLY GET, CHECKED LIVE
- ✓ **Live price/liquidity: WORKS TODAY, already free.** `DexScreener`'s own API already reports
  this chain (`chainId: "robinhood"`) — confirmed live, 30 real CASHCAT pairs returned, real
  liquidity numbers. The EXISTING market-data pipeline (`fetchMarket`, `screener.js`) already works
  for Robinhood Chain coins with zero changes — this was already true before tonight, just never
  checked. ! rugcheck-style safety checks remain Solana-only (`multichain-market-data/README`) —
  live price works, the safety gate does not, same as every other non-Solana chain already tracked.
- ✓ **Raw chain data: WORKS, confirmed live.** Public RPC `https://rpc.mainnet.chain.robinhood.com`
  answered a real `eth_chainId` call correctly (returned `0x1237` = 4663, matching). This means a
  `walletflow.js`-style wallet/flow reader is technically buildable here the same way it was for
  Solana — NOT attempted tonight, a real scoped build of its own.
- X **Human-facing explorer / historical API: BLOCKED.** Both the Blockscout explorer
  (`robinhoodchain.blockscout.com`) and its legacy `/api` endpoint returned a Cloudflare
  "Just a moment..." bot-challenge page to a plain script request — not a refusal that reads as
  data (D-93's shape), a hard wall a simple HTTP client cannot pass. ! this is DIFFERENT from
  Google News' anti-bot behaviour (that one still returned a valid empty response); this one
  returns nothing usable at all without solving a real browser challenge.
- ∴ **the honest position on price HISTORY**: `[[trading-strategy/admission-backtest]]`'s original
  finding stands — GeckoTerminal does not index this chain, and the explorer that WOULD give
  historical candles is Cloudflare-blocked. The only way to get real history today is building it
  ourselves from the raw RPC (reading swap events block-by-block, the same shape as
  `walletflow.js`'s Solana work) — a real, scoped project, not a quick add.

## WHAT THIS ACTUALLY UNBLOCKS
- Live tracking of Robinhood Chain coins (CASHCAT already IS tracked — `data/watchlist.json`) needs
  no new work; it already works.
- A real wallet-flow reader for this chain is now KNOWN BUILDABLE (RPC confirmed reachable), not
  just theoretically possible — worth scoping as its own session once Solana wallet tracking
  (`80-WHISPERS/whale-tracking`) is further along, so the same lessons aren't re-learned twice.
- Historical backtesting on Robinhood Chain coins stays blocked until either (a) GeckoTerminal adds
  the chain, or (b) someone builds a raw-RPC candle reconstructor — not attempted tonight.

## SOURCES
- [What Is Pons? The Robinhood Chain Meme Coin Factory Token (Decrypt)](https://decrypt.co/377349/pons-robinhood-chain-meme-coin-token-factory)
- [How Memecoins Took Over Robinhood Chain (HackerNoon)](https://hackernoon.com/how-memecoins-took-over-robinhood-chain)
- [A memecoin making app becomes crypto's top fee generator (CoinDesk)](https://www.coindesk.com/tech/2026/09/03/a-memecoin-making-app-becomes-crypto-s-top-fee-generators-as-robinhood-chain-activity-explodes)
- [Memecoin traders flock to Robinhood blockchain (Fortune)](https://fortune.com/crypto/2026/07/13/robinhood-chain-memecoin-trading-cash-cat-vlad-tenev-crypto/)
- [Robinhood Chain RPC & Chain ID 4663 (QuickNode builders guide)](https://www.quicknode.com/builders-guide/tools/robinhood-chain-public-rpc-by-robinhood-markets)
- [Connecting to Robinhood Chain (official docs)](https://docs.robinhood.com/chain/connecting)
