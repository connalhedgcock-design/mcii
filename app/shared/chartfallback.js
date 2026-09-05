// T-009 / the "chart history while both laptops are closed" gap. `geckoterminal.js: fetchHistory`
// still doesn't run offline (only called by the live desktop app on screen) -- unchanged tonight,
// a real scope decision (which coins, how often, rate-limit budget) that needs Connal's call, not
// guessed at here. What's buildable right now: turn the snapshots ALREADY being collected every
// cycle (`data/market.jsonl`, `data/candidates.jsonl`) into the SAME candle shape
// `geckoterminal.js: ohlcv()` already returns (`{ts, o, h, l, c, v}`), so any chart code built for
// real OHLCV can render this without a second code path -- a fallback for coverage gaps, not a
// replacement for it.
//
// !! HONESTY LABEL, READ BEFORE USING THIS FOR ANYTHING: each point here is a SINGLE PRICE READING
// taken every ~30 minutes, not a real candle aggregated from every trade in between. o=h=l=c=that
// one price, v=0 (volume isn't known at this granularity). A real OHLCV candle can show a coin
// spiked and crashed back within one interval; this cannot -- it would show a flat line between
// two points even if the real price did something dramatic in between. Labelled `synthetic: true`
// on every row so nothing downstream can mistake this for the real thing.

const fs = require('fs');
const path = require('path');
const pricesanity = require('./pricesanity');
const DATA = path.join(__dirname, '..', '..', 'data');

function readJsonl(name) {
  try {
    return fs.readFileSync(path.join(DATA, name), 'utf8').trim().split('\n')
      .filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

// A spot-price series for `ca`, shaped like `geckoterminal.js`'s real OHLCV candles so existing
// chart code can consume either. Reads BOTH market.jsonl (tracked coins) and candidates.jsonl
// (scanner-seen coins) since a coin can have history in either depending on whether it was ever
// formally tracked -- deduped by timestamp, oldest first, matching `ohlcv()`'s own ordering.
function snapshotSeries(ca) {
  const rows = [...readJsonl('market.jsonl'), ...readJsonl('candidates.jsonl')]
    .filter((r) => r.ca === ca && r.price != null);
  // T-037: an impossible price would draw a spike on the chart that never happened.
  const clean = pricesanity.cleanPrices(rows);
  const byTs = new Map();
  for (const r of clean) byTs.set(r.ts, r); // later source wins on an exact-timestamp collision, harmless either way
  return [...byTs.values()]
    .sort((a, b) => a.ts - b.ts)
    .map((r) => ({ ts: r.ts, o: r.price, h: r.price, l: r.price, c: r.price, v: r.vol24 ?? r.v24 ?? 0, synthetic: true }));
}

module.exports = { snapshotSeries };
