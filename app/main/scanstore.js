const fs = require('fs');
const path = require('path');

// The record of every market scan. One line per (scan, token) observation.
//
// A single scan can only ever rank by what has already happened -- price change, volume, whatever
// is trending. Comparing scans is what makes a forward-looking signal possible: holders arriving
// while price is flat, liquidity deepening before a move. None of that is computable from one
// snapshot, which is why this file has to start filling before the interesting metrics exist.

let dir, obsFile, scanFile;
function init(userDataPath) {
  dir = path.join(userDataPath, 'scans');
  fs.mkdirSync(dir, { recursive: true });
  obsFile = path.join(dir, 'observations.jsonl');
  scanFile = path.join(dir, 'scans.jsonl');
}

function record(result) {
  const scanTs = result.scannedAt;
  const rows = [];
  for (const c of result.survivors) {
    rows.push({
      ts: scanTs, ca: c.ca, sym: c.symbol, name: c.name, via: c.via,
      price: c.priceUsd, mcap: Math.round(c.marketCap || 0),
      liq: Math.round(c.liquidityUsd || 0), vol24: Math.round(c.volume24h || 0),
      txns24: c.txns24h, ageH: c.ageHours != null ? +c.ageHours.toFixed(1) : null,
      chg24: c.change24h, holders: c.safety?.totalHolders ?? null,
      top1: c.safety?.top1Pct != null ? +c.safety.top1Pct.toFixed(2) : null,
      verdict: c.gate?.verdict ?? null, flags: c.gate?.findings?.length ?? 0,
    });
  }
  try {
    if (rows.length) fs.appendFileSync(obsFile, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
    fs.appendFileSync(scanFile, JSON.stringify({
      ts: scanTs, tookMs: result.tookMs, universe: result.universe,
      tradeable: result.rejectedStage1.length ? result.universe - result.rejectedStage1.length : null,
      survivors: result.survivors.length,
      // Rejection reasons are kept because they describe the market, not just the filter: a day
      // where 90% fail on liquidity is a different market from one where 90% fail on safety.
      rejects: tally([...result.rejectedStage1, ...result.rejectedStage2]),
    }) + '\n');
  } catch {}
  return rows.length;
}

function tally(rejected) {
  const t = {};
  for (const r of rejected) {
    const k = String(r.rejected || 'unknown')
      .replace(/\$[\d,]+/, '$X').replace(/[\d.]+h/, 'Nh').replace(/\d+(\.\d+)?/g, 'N');
    t[k] = (t[k] || 0) + 1;
  }
  return t;
}

function readObs(sinceMs) {
  try {
    const cutoff = sinceMs ? Date.now() - sinceMs : 0;
    return fs.readFileSync(obsFile, 'utf8').trim().split('\n')
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((r) => r && r.ts >= cutoff);
  } catch { return []; }
}

function trajectories(sinceMs = 24 * 864e5 / 24) {
  const byToken = new Map();
  for (const o of readObs(sinceMs)) {
    if (!byToken.has(o.ca)) byToken.set(o.ca, []);
    byToken.get(o.ca).push(o);
  }
  for (const arr of byToken.values()) arr.sort((a, b) => a.ts - b.ts);
  return byToken;
}

const growth = (a, b) => (a && b && a > 0) ? ((b - a) / a) * 100 : null;

// The point of storing scans. A token seen once at +800% is a token that already moved. A token
// seen across many scans with holders climbing while price sits still is people accumulating
// before anything shows on a chart -- which is the only kind of "early" this tool can honestly
// claim, because it is measured rather than guessed.
function risers({ minScans = 4, windowMs = 6 * 36e5 } = {}) {
  const out = [];
  for (const [ca, obs] of trajectories(windowMs)) {
    if (obs.length < minScans) continue;
    const first = obs[0], last = obs[obs.length - 1];
    const spanH = (last.ts - first.ts) / 36e5;
    if (spanH < 0.25) continue;

    const holderGrowth = growth(first.holders, last.holders);
    const liqGrowth = growth(first.liq, last.liq);
    const priceGrowth = growth(first.price, last.price);
    const persistence = obs.length;

    // Accumulation: audience and depth building faster than price. Deliberately requires price
    // NOT to have run, which is what separates this from every trending list.
    const accumulating = holderGrowth != null && liqGrowth != null && priceGrowth != null &&
      holderGrowth > 5 && liqGrowth > 3 && priceGrowth < 15;

    out.push({
      ca, sym: last.sym, name: last.name, scans: persistence, spanHours: +spanH.toFixed(2),
      holderGrowth: holderGrowth != null ? +holderGrowth.toFixed(1) : null,
      liqGrowth: liqGrowth != null ? +liqGrowth.toFixed(1) : null,
      priceGrowth: priceGrowth != null ? +priceGrowth.toFixed(1) : null,
      accumulating, last,
      // Ranked on people-arriving-per-unit-price-move. Not on price.
      score: accumulating ? (holderGrowth + liqGrowth) / Math.max(Math.abs(priceGrowth), 5) : 0,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

// Keeps the file bounded without losing the shape of history.
function prune(keepMs = 7 * 864e5) {
  try {
    const keep = readObs(keepMs);
    fs.writeFileSync(obsFile + '.tmp', keep.map((r) => JSON.stringify(r)).join('\n') + '\n');
    fs.renameSync(obsFile + '.tmp', obsFile);
    return keep.length;
  } catch { return 0; }
}

module.exports = { init, record, readObs, trajectories, risers, prune };
