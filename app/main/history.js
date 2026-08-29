const fs = require('fs');
const path = require('path');
const sanity = require('../shared/sanity');

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

// RugCheck's "totalHolders" used to mean token accounts including empty ones; the fix that
// renamed it (commit ca27b2d, "define holders, compute ground truth from chain") landed here.
// Any row recorded at or before this moment measured a DIFFERENT quantity than "holders" means
// today, so a trend or delta that spans this boundary is comparing two different metrics and will
// report a fake collapse (or surge) that never happened -- exactly what produced "CATE lost 53.7%
// of its holders" from a real reading of 252,283 token accounts against a real reading of 116,808
// actual holders. Never let 'holders' rows from either side of this line be diffed together.
const HOLDERS_REDEFINED_AT = 1787932664000; // 2026-08-28T15:57:44.000Z

let dir, sharedDir;
function init(userDataPath, repoRoot) {
  dir = path.join(userDataPath, 'history');
  fs.mkdirSync(dir, { recursive: true });
  // The repo's data/ directory, written hourly by the cloud collector and shared through git.
  // Reading it means a freshly cloned machine opens with the full history rather than nothing,
  // and both operators see the same record even when only one of them has been at their desk.
  if (repoRoot) sharedDir = path.join(repoRoot, 'data');
}

// Rows the cloud collected for one token. Read-only here: nothing local ever writes to data/,
// so there is no conflict to resolve -- the cron is the only writer.
function readShared(file, ca) {
  if (!sharedDir) return [];
  try {
    return fs.readFileSync(path.join(sharedDir, file), 'utf8').trim().split('\n')
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((r) => r && (!ca || r.ca === ca));
  } catch { return []; }
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
  const cutoff = sinceMs ? Date.now() - sinceMs : 0;
  let local = [];
  try {
    local = fs.readFileSync(socialFile(ca), 'utf8').trim().split('\n')
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((r) => r && r.ts >= cutoff);
  } catch {}
  const shared = readShared('social.jsonl', ca).filter((r) => r.ts >= cutoff);
  const seen = new Set(local.map((r) => r.ts));
  let rows = local.concat(shared.filter((r) => !seen.has(r.ts)));
  if (src) rows = rows.filter((r) => (r.src || 'live') === src);
  return rows.sort((a, b) => a.ts - b.ts);
}

// Which windows already have a bucket, so a backfill never pays twice for the same hour.
function haveSocialBuckets(ca) {
  return new Set(readSocial(ca).map((r) => r.ts));
}

function record(ca, token) {
  const m = token.market, s = token.safety, x = token.exit;
  if (!m) return;

  // Guard before writing. A reading that claims something physically impossible is evidence about
  // the SOURCE, not the token, and storing it corrupts every trend and alert computed afterwards.
  const prior = readLocal(ca).filter((r) => r.holders != null && r.ts > HOLDERS_REDEFINED_AT).pop();
  let holders = s?.totalHolders ?? null;
  let holdersSuspect = null;
  if (prior && holders != null) {
    const hrs = (Date.now() - prior.ts) / 36e5;
    const chk = sanity.checkDelta('holders', prior.holders, holders, hrs);
    if (!chk.ok) { holdersSuspect = chk.reason; holders = null; }
  }
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
    holders,
    holdersSuspect,
    top1: s?.top1Pct ?? null,
    top10: s?.top10Pct != null ? Math.round(s.top10Pct * 10) / 10 : null,
    verdict: token.gate?.verdict ?? null,
    flags: token.gate?.findings?.length ?? null,
  };
  try { fs.appendFileSync(file(ca), JSON.stringify(row) + '\n'); } catch {}
  return row;
}

// Local rows only, unmerged -- used by the sanity guard, which must compare against what THIS
// machine last saw rather than against a cloud row written seconds ago by a different collector.
function readLocal(ca) {
  try {
    return fs.readFileSync(file(ca), 'utf8').trim().split('\n')
      .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

function read(ca, sinceMs) {
  const cutoff = sinceMs ? Date.now() - sinceMs : 0;
  let local = [];
  try {
    local = fs.readFileSync(file(ca), 'utf8').trim().split('\n')
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((r) => r && r.ts >= cutoff);
  } catch {}
  // Merge the shared cloud record with whatever this machine observed itself. Deduped on
  // timestamp so a machine that was awake during a cloud run does not double-count that moment.
  const shared = readShared('market.jsonl', ca).filter((r) => r.ts >= cutoff);
  const seen = new Set(local.map((r) => r.ts));
  const merged = local.concat(shared.filter((r) => !seen.has(r.ts)));
  return merged.sort((a, b) => a.ts - b.ts);
}

// Change over a window, using the oldest reading inside it. Returns null rather than a
// fabricated zero when there is not enough history yet -- the UI must be able to say
// "not enough data" instead of implying nothing moved.
function delta(ca, field, windowMs) {
  // Rows flagged suspect for this field are excluded, so a vendor's broken index can never
  // produce a trend line or fire an alert.
  let rows = read(ca, windowMs)
    .filter((r) => r[field] != null && !r[`${field}Suspect`]);
  if (field === 'holders') rows = rows.filter((r) => r.ts > HOLDERS_REDEFINED_AT);
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
  let rows = read(ca, windowMs).filter((r) => r[field] != null);
  if (field === 'holders') rows = rows.filter((r) => r.ts > HOLDERS_REDEFINED_AT);
  return rows.map((r) => ({ ts: r.ts, v: r[field] }));
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

module.exports = { init, record, read, readLocal, delta, series, recordSocial, readSocial, haveSocialBuckets,
                   loadSeen, saveSeen };
