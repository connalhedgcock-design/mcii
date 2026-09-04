# Shared data

Written by the collector on the collection host (`70-AREAS/collection-host/`), on a systemd timer
at `*:12,42` — twice an hour. Not GitHub Actions any more (D-98). Do not edit the collector-written
files by hand — the next run overwrites conflicting changes.

- `market.jsonl` — one row per token per collection: price, liquidity, exit capacity, holders
- `social.jsonl` — one row per token per collection: how many people posting, sentiment, manipulation markers
- `social-latest.json` — newest social reading per coin only, for the Telegram worker (D-96)
- `sector.jsonl` — one row per sweep: the wider market chatter read, tickers identified
- `post-facts.jsonl` — one row per social post paid for, the bulk evidence record (D-99)
- `scans.jsonl` — one row per market scan: how many coins found, filtered, and why
- `candidates.jsonl` — coins that passed every filter, with their trajectory across scans
- `holders-onchain.jsonl` — daily ground-truth holder count + concentration, computed from chain
- `holder-truth.json` — the latest onchain holder check, compared against the live estimate
- `ticker-collisions.json` — coins that share a ticker with another live coin (D-73)
- `query-runs.json` — when each social query last ran, for the per-query cadence gate
- `x-spend.json` — this month's X/social spend, read by `./spend.sh`

**User-managed, edited by the app, never overwritten by the collector:**
- `watchlist.json` — coins either operator added (D-16: no hardcoded tokens, user-managed only)
- `wallets.json` — wallets either operator is following, so `walletflow.js`
  (`app/main/adapters/walletflow.js`) knows whose activity to read. ! WHO GOES IN HERE IS NEVER
  THE ALGORITHM'S CALL — there is no free, honest source of "known good trader" wallets (checked,
  see `80-WHISPERS/whale-tracking/README.md`), so this list is curated by a person, the same D-16
  pattern already used for coins. Shape: `{ "address": "<solana address>", "nick": "<or null>",
  "addedBy": "connal" | "austin", "addedAt": "<ISO date>" }`. Empty until someone adds one.

Both laptops read all of the above. Only `watchlist.json` and `wallets.json` are ever written by
the app itself; everything else is the collector's, and two writers on one file is how `data/`
gets a merge conflict.
