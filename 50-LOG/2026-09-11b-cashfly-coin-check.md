---
id: log.cashfly-coin-check-2026-09-11b
t: log
v: 1
upd: 2026-09-11
machine: connal
---
# CASHFLY — address-paste lookup, Robinhood chain

Connal pasted `0x3e3D77d855AedD7A46C1BA5A3E676b224421514E` in chat asking for research. No
decisions.md row, no prior signal in any `50-LOG/signals-*.jsonl` file — first time this address
has come up in the vault.

## fact: live market data (DexScreener API pull, this session)
- Name: Cash Fly, ticker CASHFLY. Chain: "robinhood" (Robinhood Chain, the Arbitrum L2 Robinhood
  launched July 2026 — background confirmed via web search this session, not assumed).
- Created ~2026-09-11, hours old at the time of this check (pair-creation timestamp decoded
  directly, not taken from the tool's own mis-rendered "October 2024" label — that label was wrong).
- Price $0.0001902, market cap $190,228 (= FDV, no separate locked-supply gap). Liquidity $41,213.
- 24h volume $677,357 against that $41K liquidity — about 16x the pool's own liquidity traded in a
  day. 24h change +248%. 24h buys 5,231 vs sells 3,767 — more buys than sells by count, consistent
  with the pump not having reversed yet, not proof it won't.

## fact: holder data (Robinhood Chain's own Blockscout explorer, live pull this session)
- 2,860 holders, 16,649 transfers, fixed supply 1,000,000,000 CASHFLY, 18 decimals.
- Top holder is `PonsV2LaunchLocker` at 8.16% — a locker contract from the launch platform, not a
  person's wallet. Every other holder is under 1%. No single wallet controls a dangerous share.

## fact: what CASHFLY actually is — deployed via Pons
Pons is Robinhood Chain's version of Solana's pump.fun: anyone types a name and ticker, no code,
and it deploys a fixed 1B-supply token straight into a trading pool in about 30 seconds — no team
allocation by design. Pons has minted roughly 646,000 of these since July 2026, ~25,000 in a single
recent day. CASHFLY is one of that flood, confirmed via web search (Yahoo Finance, Bitget,
Datawallet coverage of Pons), not inferred.

## est: this is a name riding on Cash Cat, not an independent idea
Cash Cat (CASHCAT) — the "Robinhood's original working name" joke coin — is Robinhood Chain's
flagship memecoin, ~$147M market cap, ~57,000 holders as of mid-August. "Cash Fly" sharing the
"Cash___" prefix, on the same factory, days later, fits the well-documented pattern of copycat
names spawning after one coin on a launchpad goes viral. This is a read of the pattern, not
confirmed intent — no team or founder statement found either way.

## fact: no team, no socials found
Unlike a prior check on this vault (SHROOM, 2026-09-10, which had a real X/Telegram), a web search
for "Cash Fly" / "CASHFLY" token turned up nothing project-specific — no site, no X, no Telegram.
Silence isn't proof of a scam on a no-code instant-launchpad (most of the ~646K Pons tokens have no
socials by construction), but it does mean there is nothing to check for team credibility either.

## fact: unofficial "Robinhood chain explorer" sites exist and are unverified
Search results for a Robinhood Chain explorer surfaced several branded sites (Robinscan,
Robinscanner, HoodScan, HoodExplorer) not referenced in Robinhood's own docs — flagged by the
search summary itself as possibly harvesting wallet signatures. Not used here; holder data above
came from the official `robinhoodchain.blockscout.com` only. Worth a standing caution if Connal or
Austin go looking at a coin's holders directly.

## ∴ what this means, conf ~55%
The holder spread is genuinely clean — no rug-shaped concentration in a single wallet. But a coin
hours old, on a factory that produces ~25,000 near-identical tokens a day, already up 248% with 16x
its own liquidity traded in one day, has the shape of a pump that has already happened, not one
still building. The name pattern (a "Cash___" token appearing after Cash Cat's run) makes this read
as one of many copies chasing that success, not a fact about this specific team's intent since no
team could be found either way.

## falsifier
Wrong (safer than this read suggests) if liquidity and holder count keep growing over the next 1-2
days without the top holders re-consolidating, and price holds near current levels rather than
round-tripping back down. Confirmed (this read was right to be cautious) if price gives back most
of the 248% move within the next day or two, especially alongside falling holder count or volume
collapsing toward zero — the standard shape of a Pons-token pump that already peaked.

## vibe / unknown — explicitly not fabricated
No independent knowledge of a "Cash Fly" team or roadmap beyond what these two data pulls and
searches show. Contract source-code verification status not confirmed this session (holder/supply
data came from Blockscout's token page, not its contract tab). No rug-check-equivalent scanner run
for this chain (same gap noted in the prior SHROOM check).

## SOURCES
- DexScreener API, token `0x3e3D77d855AedD7A46C1BA5A3E676b224421514E` — live pull, this session.
- `robinhoodchain.blockscout.com` — official Blockscout explorer, token + holders pages, live pull.
- Web search: Robinhood Chain launch background (Yahoo Finance, crypto.news, Robinhood newsroom).
- Web search: Pons launchpad mechanics and scale (Medium/Coinmonks, Yahoo Finance, Bitget, MEXC,
  Memeburn, Datawallet, AirdropAlert).
- Web search: Cash Cat background and market cap (Phemex, Bitcoin Foundation, CoinGecko).
