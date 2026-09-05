// Connal, 2026-09-05: expand discovery to find coins upticking in trend, not only what followed
// traders touch. Checked first, per this project's own "verify inside the running system" rule
// (D-85) rather than assumed: `cloud-collect.js` ALREADY appends every scan's survivors to
// `data/candidates.jsonl` on the same twice-hourly cadence as everything else, and has done since
// screener.js existed -- 3,480 rows, 120 distinct coins, 87 of them seen 3+ times across an 8.5-day
// span (measured 09-05). ! this corrects the wrong claim logged earlier the same night
// (`70-AREAS/trading-strategy/LOG.md`, 09-05 entry) that no such record existed -- it was read
// before `cloud-collect.js`'s own append call was checked. The record was there the whole time.
//
// WHAT THIS DOES: for every coin `candidates.jsonl` has seen repeatedly, measures price movement
// from its earliest to its most recent scan, and how CONSISTENT that movement was (not one spike --
// most of the individual scan-to-scan steps agreeing on direction). Excludes anything already on
// `data/watchlist.json` -- those are not discovery targets any more.
//
// ! THIS IS A REPORT, NOT A DECISION. It does not touch `admission.js` or the real watchlist.
// `main/index.js`'s own discovery comment states the discipline this follows: wire one path, prove
// it against real data, THEN decide whether to add the next -- FOMO is wired, social ticker
// resolution is the already-chosen next candidate, not this. Whether a sustained-uptick candidate
// should ever auto-admit, or only ever surface for a human to look at, is Connal's call, not
// assumed here.
// ! SAME SOURCE BIAS AS EVERYTHING screener.js FINDS: `discover()` only pulls from DexScreener's
// newest/promoted listings and GeckoTerminal's trending-by-volume -- already-new or already-popular.
// A sustained climb inside that universe is still a real, checkable pattern; it does not fix the
// documented bias in what gets INTO the universe in the first place.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const MIN_READINGS = 4; // below this, "a trend" is one or two data points -- noise, not a pattern
const MIN_SPAN_HOURS = 6; // two readings 30 min apart cannot show a "trend", only a single move

function readJsonl(name) {
  const file = path.join(DATA_DIR, name);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function loadWatchlist() {
  try {
    const w = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'watchlist.json'), 'utf8'));
    return new Set(w.map((c) => c.ca));
  } catch { return new Set(); }
}

// Fraction of consecutive scan-to-scan price steps that moved in the SAME direction as the overall
// (first->last) move. 1.0 = every step agreed (a clean climb); near 0.5 = as much noise as signal.
function consistency(rows) {
  const overallUp = rows[rows.length - 1].price > rows[0].price;
  let agree = 0, total = 0;
  for (let i = 1; i < rows.length; i++) {
    const d = rows[i].price - rows[i - 1].price;
    if (d === 0) continue;
    total++;
    if ((d > 0) === overallUp) agree++;
  }
  return total ? agree / total : null;
}

function analyze() {
  const rows = readJsonl('candidates.jsonl').filter((r) => r.price != null);
  const tracked = loadWatchlist();
  const byCa = new Map();
  for (const r of rows) {
    if (!byCa.has(r.ca)) byCa.set(r.ca, []);
    byCa.get(r.ca).push(r);
  }

  const results = [];
  for (const [ca, group] of byCa) {
    if (tracked.has(ca)) continue; // already a real position -- not a discovery target
    group.sort((a, b) => a.ts - b.ts);
    if (group.length < MIN_READINGS) continue;
    const spanHours = (group[group.length - 1].ts - group[0].ts) / 36e5;
    if (spanHours < MIN_SPAN_HOURS) continue;

    const first = group[0], last = group[group.length - 1];
    const priceChange = first.price > 0 ? (last.price - first.price) / first.price : null;
    const liqChange = first.liq > 0 ? (last.liq - first.liq) / first.liq : null;
    const cons = consistency(group);

    results.push({
      sym: last.sym, ca, readings: group.length, spanHours: +spanHours.toFixed(1),
      priceChangePct: priceChange != null ? +(priceChange * 100).toFixed(1) : null,
      liqChangePct: liqChange != null ? +(liqChange * 100).toFixed(1) : null,
      consistency: cons != null ? +(cons * 100).toFixed(0) : null,
      lastLiq: last.liq, lastHolders: last.holders, lastVerdict: last.verdict,
    });
  }

  // Worst-first is the project's own convention -- but for a discovery report the useful sort is
  // "most sustained upward move first", so rank by consistency*magnitude, not magnitude alone (a
  // single spike with 50% consistency is a coin flip, not a trend).
  results.sort((a, b) => (b.consistency ?? 0) * (b.priceChangePct ?? 0) - (a.consistency ?? 0) * (a.priceChangePct ?? 0));
  return results;
}

function main() {
  const results = analyze();
  console.log(`${results.length} candidates with >=${MIN_READINGS} readings over >=${MIN_SPAN_HOURS}h, not already tracked\n`);
  console.log('sym'.padEnd(14), 'readings'.padStart(8), 'span(h)'.padStart(8), 'price%'.padStart(8), 'liq%'.padStart(8), 'consist%'.padStart(9), 'holders'.padStart(9), 'verdict'.padStart(9));
  for (const r of results.slice(0, 25)) {
    console.log(
      String(r.sym).padEnd(14), String(r.readings).padStart(8), String(r.spanHours).padStart(8),
      String(r.priceChangePct).padStart(8), String(r.liqChangePct).padStart(8),
      String(r.consistency).padStart(9), String(r.lastHolders ?? '—').padStart(9),
      String(r.lastVerdict ?? '—').padStart(9),
    );
  }
}

if (require.main === module) main();
module.exports = { analyze };
