# Shared data

Written by the hourly GitHub Actions collector. Do not edit by hand — the next run will
overwrite conflicting changes.

- `market.jsonl` — one row per token per collection: price, liquidity, exit capacity, holders
- `social.jsonl` — one row per token per collection: how many people posting, sentiment, manipulation markers
- `scans.jsonl` — one row per market scan: how many coins found, filtered, and why
- `candidates.jsonl` — coins that passed every filter, with their trajectory across scans

Both laptops read these. Neither writes them, so there is nothing to conflict.
