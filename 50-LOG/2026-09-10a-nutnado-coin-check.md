---
id: log.nutnado-coin-check-2026-09-10a
t: log
v: 1
upd: 2026-09-10
machine: connal
---
# NUTNADO — address-paste lookup, Solana pump.fun

Connal pasted `8ncUH4kRwfFwASGwQFYAV8PvpJCSbkffgcYW1mjrpump` in chat asking to check it. No prior
vault record on this address (checked decisions.md, signals-Connals-Air.jsonl, full-vault grep —
nothing). Per mandate, disconfirming evidence first.

## fact: live market data (DexScreener API, live pull this session)
- Name/symbol: "NUTNADO" / NUTNADO. Chain: Solana. DEX: PumpFun, still on the bonding curve (not
  migrated to an AMM yet).
- Price: $0.000004775. Market cap / FDV: ~$4,775 — extremely small, effectively a brand-new launch.
- 1h volume: $12,301. Price change 1h: +64%. Buys 236 / sells 136 (1h window; API returned identical
  figures for h1/h6/h24, i.e. this pair is younger than 6 hours old and the windows haven't
  diverged yet).
- 5-min snapshot: 193 buys / 107 sells, +28% — buy pressure concentrated very recently.

## fact: rug-check data (RugCheck API, live pull this session)
- Mint authority: revoked (null). Freeze authority: revoked (null). Both rug vectors closed.
- **Danger flag: "Creator history of rugged tokens."** RugCheck's own risk score is 80/100 (their
  scale runs risk-up, not safety-up) — driven entirely by this one flag.
- Creator wallet `BvgE1K46Hd4g5vbeoy1GXfDdvvLZUmELa4WASKjG8skm` has launched **~50 tokens in the
  past 8 days** (2026-09-02 through today), every one landing in a tight $2,750–$3,250 market-cap
  band before presumably being abandoned. That band-clustering is a mechanical signature of a
  template launcher, not 50 separate organic projects.
- Creator still holds 1.57% of NUTNADO's supply (not a full pre-sold exit, but not zero either).
- Liquidity: ~$3,586 total (both sides). 150 holders. Top non-pool holder sits at 2.88% — no single
  whale dominates the remaining float, but the *pool itself* is thin enough that a few thousand
  dollars of selling would move price hard.
- `rugged` flag currently reads **false** — but that flag only fires after a pool-drain event is
  detected, so "not yet" is the correct reading, not "cleared."

## ∴ what this means, conf ~80%
The technical rug switches (mint/freeze) are off, same as most pump.fun launches now — that part
tells you nothing distinguishing. The load-bearing fact is the creator's launch pattern: one wallet
spinning up a new near-identical token roughly every 3-4 hours for over a week, each one stalling
around $3K market cap. That is the fingerprint of someone running a volume/spam factory, harvesting
whatever early buyers show up on each one, not building a project. NUTNADO is currently the
freshest one still in its pump phase (+64%/1h on a coin younger than 6 hours). Nothing here is
project-specific — there is no reason to believe NUTNADO is meaningfully different from the other
~49 tokens this same wallet has already put out.

## falsifier
Wrong if this creator wallet's prior ~49 tokens show real, sustained holder growth and trading
activity days later (i.e., the pattern isn't abandon-and-relaunch) — not checked this session, would
need per-token history pulls. Confirmed if NUTNADO's price stalls/reverses within hours the way the
market-cap clustering on prior launches suggests it should, or if the creator wallet's 1.57% balance
starts moving out.

## vibe / unknown — explicitly not fabricated
No name/story behind "NUTNADO" beyond the pump.fun listing — not inventing one. Did not check
whether the creator wallet's other ~49 tokens were literally rugged (liquidity pulled) versus simply
abandoned to zero volume — RugCheck's flag text says "history of rugged tokens" but this session did
not independently verify each one.

## SOURCES
- DexScreener API, token `8ncUH4kRwfFwASGwQFYAV8PvpJCSbkffgcYW1mjrpump` — live pull, this session.
- RugCheck API, same address — live pull, this session (includes creator's token-launch history).
