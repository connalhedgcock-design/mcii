---
id: spec.arch
t: spec
v: 1
upd: 2026-08-23
---
# ARCHITECTURE
```
MCII/                        <- obsidian vault root (.obsidian here) + syncthing folder
  00-INDEX.md .. 60-KB/      <- THE VAULT. markdown. synced. human+claude readable-ish.
  app/                       <- ! add to obsidian userIgnoreFilters (node_modules kills the indexer)
    main/                    <- electron main. ALL network + ALL secrets live here.
      adapters/              <- SourceAdapter per provider
      collectors/            <- schedulers, leader-election client
      claude/                <- Claude Code CLI subprocess bridge
    renderer/                <- react. ZERO network access, ZERO secrets.
    shared/                  <- types, scoring pure fns (unit-testable, no io)
    sidecar/                 <- ! gitignored, NOT synced. rolling JSON snapshots.
  .env                       <- ! gitignored + syncthing-ignored. keys.
```
## PROCESS MODEL  ! security is not optional in a finance app
- contextIsolation:true, nodeIntegration:false, sandbox:true, strict CSP, `will-navigate` blocked.
- renderer↔main only via a narrow typed preload IPC allowlist. renderer never sees a key, never makes a request.
- external links open in system browser, never in-app.
- ! no remote code loading. no CDN scripts. everything bundled.

## STORAGE TIERS  (see [[sync]] for why)
- T1 vault markdown > Syncthing. theses, forecasts, notes, decisions.
- T2 timeseries + shared state > **cloud Postgres free tier** (Supabase/Neon). single source of truth. both machines read/write.
- T3 local cache > local SQLite, **device-local, NEVER synced**. rebuildable from T2.
- T4 secrets > local .env + OS keychain. never synced, never in vault, never in repo.
- !! rule: SQLite must never enter a Syncthing folder. file-sync + live DB = corruption. see [[grill]] G-05.

## SIDECAR JSON  (their "temp holder, don't bloat storage")
- purpose: the context payload for the Claude sidebar. NOT a database.
- shape: per-token rolling snapshot — current scores, last 24h bucketed series (not raw posts), top-k posts by engagement, active alerts, provenance map.
- ! bounded by construction: top-k posts (k~20), fixed 96×15m buckets, hard byte ceiling ~200KB/token. atomic write (tmp+rename).
- retention: raw posts > 7d local then dropped; only aggregates + a sample survive to Postgres. this is what keeps storage flat.
- ∴ storage grows O(tokens × time × buckets), not O(posts). that was the real concern behind their request.

## CLAUDE CLI BRIDGE
- main process spawns the local `claude` binary as a subprocess, feeds it the sidecar JSON + vault context, streams output to the sidebar.
- ! $0 marginal cost — uses the subscription they already have, not a metered API key. this is what keeps the whole project inside $20.
- ! `claude` was NOT on PATH at 2026-08-23 recon. P0 must locate/install it and make the path configurable.
- system prompt for the bridge = [[mandate]] verbatim. the in-app assistant must have the same non-yes-man constraints I do.
- ! every response must cite the fetched_at of what it used. unsourced AI claim = bug.

## SCORING PURITY
- all scoring in `shared/` as pure functions over typed inputs. no io, no clock, no randomness (seed injected).
- ∵ makes backtests trivially replayable and stops the classic lookahead bug where a "backtest" quietly uses future data.
- ! every scoring fn ships with a golden-file test. a silently-changed score invalidates the entire calibration record.
