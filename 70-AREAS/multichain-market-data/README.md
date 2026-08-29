---
id: area.multichain.readme
t: area-readme
v: 1
upd: 2026-08-29
machine: austin
---
# MULTICHAIN MARKET DATA — Solana-first is not Solana-only, and search ranking was gameable

## WHAT THIS IS
The app's four external data services split into two different scopes, and until 08-29 the code
did not consistently know the difference:
- `main/adapters/dexscreener.js` (price, mcap, liquidity, volume, 24h change) — genuinely
  **multichain**, but was WRITTEN Solana-first with a fallback that could never actually fire.
- `rugcheck.js` (safety/holders), `jupiter.js` (sale-simulation), `geckoterminal.js` (chart) — are
  **actually Solana-only**. no fallback exists for these; there is nothing to fall through to.

Separately: `searchTokens()` ranked candidate coins by a self-reported "liquidity" number, which is
trivially fake-able by anyone who mints a token and seeds one pool with an inflated LP.

## STATUS
Both fixed 08-29. `data/watchlist.json` was corrected in the same session — see LOG.md for the
specific tokens involved (a Solana-vs-Robinhood-chain CASHCAT, and an impostor ANSEM that had
displaced the real one in search results).

## THE CORE LESSON, FOR ANY FUTURE ADAPTER WORK
1. **An empty result is not an error.** `token-pairs/v1/solana/{addr}` answers `[]`, not a thrown
   exception, for a token that simply isn't on Solana. Code that only falls back on a `catch` will
   never reach the fallback for this case. Check for "empty and unhelpful," not just "threw."
2. **Ticker + name are not identity.** Two tokens can share both. Reason from the contract address,
   and from numbers a copy can't cheaply fake (real daily volume, pool count) — never from a
   self-reported reserve figure a single pool can claim without moving anything through it.
3. Addresses need chain-appropriate comparison: EVM addresses are case-insensitive; comparing with
   `===` against a checksummed address silently matches nothing.

## READ NEXT
- [[LOG|LOG.md]] — the CASHCAT and ANSEM incidents, root cause, and the exact fix in
  `dexscreener.js` and `main/index.js`.
