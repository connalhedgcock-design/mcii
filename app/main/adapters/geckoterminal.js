const { getJSON } = require('./http');
const BASE = 'https://api.geckoterminal.com/api/v2';

// Free, no key, ~30 requests/min. Gives the price history DexScreener does not.
async function mainPool(ca) {
  const d = await getJSON(`${BASE}/networks/solana/tokens/${ca}/pools`);
  const pools = (d && d.data) || [];
  if (!pools.length) throw new Error('no pools on GeckoTerminal');
  pools.sort((a, b) => parseFloat(b.attributes.reserve_in_usd || 0) - parseFloat(a.attributes.reserve_in_usd || 0));
  return pools[0].attributes.address;
}

// timeframe: 'day' | 'hour' | 'minute'
async function ohlcv(pool, timeframe = 'day', limit = 90) {
  const d = await getJSON(`${BASE}/networks/solana/pools/${pool}/ohlcv/${timeframe}?limit=${limit}`);
  const list = d?.data?.attributes?.ohlcv_list || [];
  // API returns newest-first; charts want oldest-first.
  return list
    .map(([ts, o, h, l, c, v]) => ({ ts: ts * 1000, o, h, l, c, v }))
    .sort((a, b) => a.ts - b.ts);
}

async function fetchHistory(ca) {
  const pool = await mainPool(ca);
  const [days, hours] = await Promise.all([
    ohlcv(pool, 'day', 90).catch(() => []),
    ohlcv(pool, 'hour', 168).catch(() => []),
  ]);
  return { pool, days, hours, fetchedAt: Date.now() };
}
module.exports = { fetchHistory };
