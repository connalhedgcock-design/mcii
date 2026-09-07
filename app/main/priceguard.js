// Shared ingestion guard: use the coin's historical quotes and this process's accepted quotes.
// No additional paid/network requests. Suspect quotes stay visible as missing, with raw evidence.
const fs = require('fs');
const path = require('path');
const { cleanPrices, checkPrice } = require('../shared/pricesanity');
const cache = new Map();
const recent = new Map();
const data = path.join(__dirname, '../../data');
function history() {
  const rows = [];
  for (const name of ['market.jsonl', 'candidates.jsonl']) {
    const file = path.join(data, name);
    try {
      const stamp = fs.statSync(file).mtimeMs;
      if (cache.get(file)?.stamp !== stamp) {
        const parsed = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap((s) => {
          try { return [JSON.parse(s)]; } catch { return []; }
        });
        const groups = new Map();
        for (const r of parsed) {
          if (!groups.has(r.ca)) groups.set(r.ca, []);
          groups.get(r.ca).push(r);
        }
        cache.set(file, { stamp, latest: [...groups.values()].map((g) => cleanPrices(g).at(-1)).filter(Boolean) });
      }
      rows.push(...cache.get(file).latest);
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  return rows;
}
function guardMarket(ca, market) {
  const row = { ca, ts: market.fetchedAt || Date.now(), price: market.priceUsd,
    liq: market.totalLiquidityUsd ?? market.liquidityUsd };
  const key = `${market.chain || ''}:${ca}`;
  const previous = [...history().filter((r) => r.ca === ca && (!r.chain || r.chain === market.chain)), recent.get(key)]
    .filter((r) => r && r.ts <= row.ts).sort((a, b) => a.ts - b.ts).at(-1);
  const verdict = checkPrice(previous, row);
  if (verdict || market.priceSuspect) return { ...market, rawPrice: market.rawPrice ?? market.priceUsd,
    priceUsd: null, priceSuspect: true, priceSuspectWhy: verdict?.why || market.priceSuspectWhy };
  recent.set(key, row);
  return market;
}
module.exports = { guardMarket };
