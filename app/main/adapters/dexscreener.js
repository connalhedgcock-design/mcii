const { getJSON } = require('./http');

// Live-testing notes, 2026-08-24:
//   /latest/dex/tokens/{ca} intermittently returns {"pairs":null} under load -- a null body, not an
//   error code. /token-pairs/v1/solana/{ca} stayed reliable under the same load, so it is primary.
//   The response also contains pairs where our token is the QUOTE side; filtering by baseToken is
//   required or liquidity totals come out wrong.
async function fetchMarket(ca) {
  let pairs;
  try {
    pairs = await getJSON(`https://api.dexscreener.com/token-pairs/v1/solana/${ca}`);
  } catch {
    const d = await getJSON(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
    pairs = d && d.pairs;
  }
  if (!Array.isArray(pairs)) throw new Error('no pair data returned');

  const mine = pairs.filter((p) => p.baseToken && p.baseToken.address === ca);
  if (!mine.length) throw new Error('token not found in any pool');
  mine.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

  const main = mine[0];
  return {
    name: main.baseToken.name,
    symbol: main.baseToken.symbol,
    priceUsd: parseFloat(main.priceUsd),
    marketCap: main.marketCap,
    poolCount: mine.length,
    // Pool lists are unstable -- CATE went 3 -> 30 pools in 24h -- so never cache these.
    totalLiquidityUsd: mine.reduce((s, p) => s + (p.liquidity?.usd || 0), 0),
    mainPool: { dex: main.dexId, liquidityUsd: main.liquidity?.usd || 0, url: main.url },
    priceChange: main.priceChange || {},
    volume: main.volume || {},
    txns: main.txns || {},
    pairCreatedAt: main.pairCreatedAt,
    fetchedAt: Date.now(),
  };
}
module.exports = { fetchMarket };

// --- Discovery -------------------------------------------------------------
// Searching by name returns impersonators as readily as the real thing: a search for "CATE"
// returns Catecoin on Solana AND a separate CateCoin on BSC. We surface all of them with the
// numbers needed to tell them apart, and key everything on address afterwards.
async function searchTokens(query) {
  const { getJSON } = require('./http');
  const d = await getJSON(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`);
  const pairs = (d && d.pairs) || [];
  const byToken = new Map();
  for (const p of pairs) {
    if (!p.baseToken) continue;
    const key = `${p.chainId}:${p.baseToken.address}`;
    const liq = p.liquidity?.usd || 0;
    const vol = p.volume?.h24 || 0;
    let t = byToken.get(key);
    if (!t) {
      t = {
        ca: p.baseToken.address, chain: p.chainId,
        symbol: p.baseToken.symbol, name: p.baseToken.name,
        priceUsd: parseFloat(p.priceUsd), marketCap: p.marketCap || 0,
        liquidityUsd: 0, volume24h: 0, pools: 0,
        change24h: p.priceChange?.h24 ?? null,
        ageDays: p.pairCreatedAt ? (Date.now() - p.pairCreatedAt) / 86400000 : null,
      };
      byToken.set(key, t);
    }
    // ⚠️ SUM across pools, do not keep only the deepest. Keeping one pool threw
    // away the single clearest difference between a real token and a copycat:
    // the real ANSEM trades across 30 pools, the impostor has 1. Collapsing to
    // the biggest pool made a 30-pool token look like a 3M one and let a single
    // fabricated pool outrank it.
    t.liquidityUsd += liq;
    t.volume24h += vol;
    t.pools += 1;
    if (p.marketCap && p.marketCap > t.marketCap) t.marketCap = p.marketCap;
    if (liq > (t._deepest || 0)) { t._deepest = liq; t.priceUsd = parseFloat(p.priceUsd); }
  }

  const rows = [...byToken.values()];
  for (const t of rows) {
    delete t._deepest;
    // A pool holding nearly the token's whole market cap is not a market, it is
    // a deposit: nobody has sold into it and nobody can. The real ANSEM carries
    // 2% of its cap as liquidity; the impostor claimed 100%.
    t.liqRatio = t.marketCap > 0 ? t.liquidityUsd / t.marketCap : null;
    t.suspect = t.liqRatio != null && t.liqRatio > 0.5 && t.pools <= 2;
  }

  // ⚠️ Ranked on REAL TRADING, not on a claimed reserve. Anyone can write a
  // number into one pool; nobody can fake millions of dollars of daily volume
  // across dozens of pools without spending it. Sorting by liquidity alone put
  // an impostor with $118k of daily volume above the token it was imitating,
  // and it was added to the watchlist because it sat at the top of the results.
  rows.sort((a, b) =>
    (a.suspect - b.suspect) ||
    (b.volume24h - a.volume24h) ||
    (b.pools - a.pools) ||
    (b.liquidityUsd - a.liquidityUsd));
  return rows.slice(0, 25);
}

// Newest tokens with a profile, and the paid-promotion feed. The boost feed is not a quality
// signal -- it is literally who paid for placement -- but it is a free, honest read on where
// promotional money is being spent, which is worth knowing for the opposite reason.
async function discoverLatest() {
  const { getJSON } = require('./http');
  const [profiles, boosts] = await Promise.all([
    getJSON('https://api.dexscreener.com/token-profiles/latest/v1').catch(() => []),
    getJSON('https://api.dexscreener.com/token-boosts/top/v1').catch(() => []),
  ]);
  return { profiles: profiles.slice(0, 30), boosts: boosts.slice(0, 30), fetchedAt: Date.now() };
}
module.exports.searchTokens = searchTokens;
module.exports.discoverLatest = discoverLatest;
