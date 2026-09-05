const { getJSON } = require('./http');
const BASE = 'https://api.geckoterminal.com/api/v2';

// Free, no key, ~30 requests/min. Gives the price history DexScreener does not.
//
// !! CHAIN-AWARE SINCE 2026-09-04. Was hardcoded to `networks/solana/...` -- fine while every
// tracked coin was Solana, wrong the moment one was not. `network` must be a GeckoTerminal network
// id (their own naming: "eth", "bsc", "base", "solana" ...), NOT dexscreener's `chain` field
// verbatim -- the two do not always agree, and GeckoTerminal's `/networks` endpoint is the source
// of truth for valid ids, checked live before trusting either side's spelling.
// ! GeckoTerminal does NOT index every chain DexScreener does. Checked live 2026-09-04 against a
// real coin: DexScreener reported chain "robinhood" and GeckoTerminal's own network list (100+
// entries, paged) has no such id at all. For a coin on an unindexed chain this throws a clear
// "network not found" rather than a confusing empty result -- there is no historical price source
// for that coin here, and that is a real gap, not a bug to route around.
async function mainPool(ca, network = 'solana') {
  const d = await getJSON(`${BASE}/networks/${network}/tokens/${ca}/pools`);
  const pools = (d && d.data) || [];
  if (!pools.length) throw new Error(`no pools on GeckoTerminal for network "${network}"`);
  pools.sort((a, b) => parseFloat(b.attributes.reserve_in_usd || 0) - parseFloat(a.attributes.reserve_in_usd || 0));
  return pools[0].attributes.address;
}

// timeframe: 'day' | 'hour' | 'minute'
async function ohlcv(pool, network = 'solana', timeframe = 'day', limit = 90) {
  const d = await getJSON(`${BASE}/networks/${network}/pools/${pool}/ohlcv/${timeframe}?limit=${limit}`);
  const list = d?.data?.attributes?.ohlcv_list || [];
  // API returns newest-first; charts want oldest-first.
  return list
    .map(([ts, o, h, l, c, v]) => ({ ts: ts * 1000, o, h, l, c, v }))
    .sort((a, b) => a.ts - b.ts);
}

async function fetchHistory(ca, network = 'solana') {
  const pool = await mainPool(ca, network);
  const [days, hours] = await Promise.all([
    ohlcv(pool, network, 'day', 90).catch(() => []),
    ohlcv(pool, network, 'hour', 168).catch(() => []),
  ]);
  return { pool, days, hours, fetchedAt: Date.now() };
}
module.exports = { fetchHistory };
