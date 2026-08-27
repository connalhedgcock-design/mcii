---
id: spec.sync
t: spec
v: 1
upd: 2026-08-23
---
# SYNC / MULTIPLAYER / FAILOVER   (grilled in G-05)
goal restated: connal + austin see the same data; whichever machine is up runs collection; handoff is automatic.

## WHY NOT SYNCTHING-FOR-EVERYTHING
- Syncthing = eventually-consistent file sync. no leader election, no transactional merge, conflicts resolved by keeping BOTH files.
- !! live DB in a synced folder = corruption. this is the #1 way this design fails.
- ✓ Syncthing IS correct for markdown: text, merge-friendly, conflicts visible + harmless. use it there and only there.

## THE DESIGN
```
  [machine A] ──┐                      ┌── Syncthing P2P (vault markdown only)
                ├── read/write ──> [ Postgres free tier ] <── read/write ──┤
  [machine B] ──┘                        (timeseries, scores,             │
                                          leader lock, watchlist)     [machine B]
        ▲
        └── GitHub Actions cron (always-on baseline collector, 30m)
```
1. **Vault** > Syncthing, direct P2P, encrypted, no cloud, free. ! ignore-patterns must exclude `app/`, `.env`, `*.db`, `sidecar/`.
2. **Shared state** > Supabase or Neon **free tier** Postgres. $0. single writer-of-truth. this is the thing that actually delivers "same information online" — Syncthing structurally cannot.
3. **Leader election** > one `collector_lock` row: `{holder, last_beat}`. leader UPDATEs last_beat every 15s. any follower seeing `now - last_beat > 90s` takes the lock via a conditional UPDATE (compare-and-swap). ~30 lines, no external service. THIS is "transfer hosting."
4. **Both offline** > GitHub Actions cron. private repo = 2,000 free min/mo; every 30min ≈ 1,440 min/mo, fits. keys in Actions secrets. ! coarse cadence by design — the tool's value is risk/trend (G-01), not minute-scale entries. local machines layer 5-min polling when awake.
5. **Secrets** > per-machine `.env`, never synced. each operator provisions their own keys.

## CONFLICT POLICY
- vault: markdown, last-writer-wins per file, Syncthing surfaces `.sync-conflict-*` — a human resolves. acceptable ∵ rare and visible.
- ! positions/theses: single-owner-per-file convention (`40-POS/cate--connal.md`). two people editing one thesis file is the only realistic conflict and this removes it structurally.
- postgres: server-side timestamps + upserts keyed `(token, source, bucket_ts)`. idempotent by construction, so a double-collect during failover is harmless. ! design every collector write to be idempotent — failover WILL cause overlapping writes.

## DEVICE COUNT — 3, not 2  (upd 2026-08-26)
- connal (A, build target) | austin (B) | peter (C, joins later).
- syncthing: N-device mesh, no change needed. postgres: no change. leader election: CAS on one row works for N.
- ! P1 needs NONE of this. single machine, local only. sync work starts at P2. do not build it early.

## OPEN
- ? "transfer emulation" undefined. reading as collector-role handoff (solved above). if they mean replicating machine A's runtime on B — different problem, and I'd argue it's unnecessary: identical app + shared Postgres already gives an identical view. NEEDS CONFIRMATION.
- ? austin's OS/arch — blocking for install docs.
- ? free-tier Postgres projects auto-pause when idle on some providers > first query after idle is slow, and some pause permanently after N days inactive. mitigate: the GHA cron doubles as a keepalive. verify current free-tier terms at P0.
