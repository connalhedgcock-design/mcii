const fs = require('fs');
const path = require('path');

// Append-only, one file per token, one JSON object per line.
//
// Why not a database: this file gets appended to and never rewritten, so a crash or a half-write
// costs one line rather than the whole store, and it can be read with any text editor. At a few
// snapshots per hour per token it stays small for years. If it ever outgrows that, the format
// imports into anything.
//
// This is the only data in the project nobody else records. Price history can be re-fetched from
// GeckoTerminal at any time; what a token's exitable value or holder count was on a given day
// exists only if we wrote it down as it happened.

let dir;
function init(userDataPath) {
  dir = path.join(userDataPath, 'history');
  fs.mkdirSync(dir, { recursive: true });
}
const file = (ca) => path.join(dir, `${ca}.jsonl`);
const socialFile = (ca) => path.join(dir, `${ca}.social.jsonl`);

// Social buckets are stored separately and every row is stamped `src` — 'live' or 'backfill'.
//
// This distinction is load-bearing, not bookkeeping. Backfilled engagement counts are inflated
// (likes accumulate after the fact), so mixing them into the baseline a hype z-score compares
// against would make every live reading look artificially quiet and skew every score that
// follows. Baselines are built from live rows only.
function recordSocial(ca, bucket, src = 'live') {
  const row = { ...bucket, src, writtenAt: Date.now() };
  try { fs.appendFileSync(socialFile(ca), JSON.stringify(row) + '\n'); } catch {}
  return row;
}

function readSocial(ca, { sinceMs, src } = {}) {
  try {
    const cutoff = sinceMs ? Date.now() - sinceMs : 0;
    let rows = fs.readFileSync(socialFile(ca), 'utf8').trim().split('\n')
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((r) => r && r.ts >= cutoff);
    if (src) rows = rows.filter((r) => r.src === src);
    return rows.sort((a, b) => a.ts - b.ts);
  } catch { return []; }
}

// Which windows already have a bucket, so a backfill never pays twice for the same hour.
function haveSocialBuckets(ca) {
  return new Set(readSocial(ca).map((r) => r.ts));
}

function record(ca, token) {
  const m = token.market, s = token.safety, x = token.exit;
  if (!m) return;
  const row = {
    ts: Date.now(),
    price: m.priceUsd,
    mcap: m.marketCap,
    liq: Math.round(m.totalLiquidityUsd || 0),
    pools: m.poolCount,
    v24: Math.round(m.volume?.h24 || 0),
    buys24: m.txns?.h24?.buys ?? null,
    sells24: m.txns?.h24?.sells ?? null,
    exitUsd: x ? Math.round(x.usd) : null,
    exitTok: x ? x.tokens : null,
    holders: s?.totalHolders ?? null,
    top1: s?.top1Pct ?? null,
    top10: s?.top10Pct != null ? Math.round(s.top10Pct * 10) / 10 : null,
    verdict: token.gate?.verdict ?? null,
    flags: token.gate?.findings?.length ?? null,
  };
  try { fs.appendFileSync(file(ca), JSON.stringify(row) + '\n'); } catch {}
  return row;
}

function read(ca, sinceMs) {
  try {
    const cutoff = sinceMs ? Date.now() - sinceMs : 0;
    return fs.readFileSync(file(ca), 'utf8').trim().split('\n')
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((r) => r && r.ts >= cutoff);
  } catch { return []; }
}

// Change over a window, using the oldest reading inside it. Returns null rather than a
// fabricated zero when there is not enough history yet -- the UI must be able to say
// "not enough data" instead of implying nothing moved.
function delta(ca, field, windowMs) {
  const rows = read(ca, windowMs).filter((r) => r[field] != null);
  if (rows.length < 2) return null;
  const first = rows[0][field], last = rows[rows.length - 1][field];
  if (!first) return null;
  return {
    from: first, to: last,
    pct: ((last - first) / first) * 100,
    spanHours: (rows[rows.length - 1].ts - rows[0].ts) / 3600000,
    n: rows.length,
  };
}

function series(ca, field, windowMs) {
  return read(ca, windowMs).filter((r) => r[field] != null).map((r) => ({ ts: r.ts, v: r[field] }));
}

// Post IDs already counted, so a bucket measures NEW activity rather than re-counting the same
// posts every cycle. Without this, a quiet token produces identical readings forever -- seven
// polls of the same twenty posts look like seven observations and are really one.
const seenFile = (ca) => path.join(dir, `${ca}.seen.json`);
const MAX_SEEN = 4000;   // bounded; oldest ids age out

function loadSeen(ca) {
  try { return new Set(JSON.parse(fs.readFileSync(seenFile(ca), 'utf8'))); } catch { return new Set(); }
}
function saveSeen(ca, set) {
  const arr = [...set].slice(-MAX_SEEN);
  try { fs.writeFileSync(seenFile(ca), JSON.stringify(arr)); } catch {}
}

module.exports = { init, record, read, delta, series, recordSocial, readSocial, haveSocialBuckets,
                   loadSeen, saveSeen };
