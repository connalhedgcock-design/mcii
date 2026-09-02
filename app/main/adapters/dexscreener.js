const { getJSON } = require('./http');

// Live-testing notes, 2026-08-24:
//   /latest/dex/tokens/{ca} intermittently returns {"pairs":null} under load -- a null body, not an
//   error code. /token-pairs/v1/solana/{ca} stayed reliable under the same load, so it is primary.
//   The response also contains pairs where our token is the QUOTE side; filtering by baseToken is
//   required or liquidity totals come out wrong.
async function fetchMarket(ca) {
  let pairs = null;

  // Solana first: under load the token-pairs endpoint stays reliable where the
  // multichain one intermittently returns {"pairs":null}.
  try {
    const r = await getJSON(`https://api.dexscreener.com/token-pairs/v1/solana/${ca}`);
    if (Array.isArray(r) && r.length) pairs = r;
  } catch { /* fall through */ }

  // ⚠️ AN EMPTY ARRAY IS NOT AN ERROR, and that is why this fallback never ran.
  // The old code only reached it when the Solana call THREW; for a token on any
  // other chain the Solana endpoint answers `[]` quite happily, so the app
  // reported "token not found in any pool" about CASHCAT — a coin trading $22M
  // a day on Robinhood's chain. The app is Solana-first, not Solana-only, and
  // the difference has to be in the control flow rather than in a comment.
  if (!pairs || !pairs.length) {
    const d = await getJSON(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
    pairs = (d && d.pairs) || [];
  }
  if (!Array.isArray(pairs)) throw new Error('no pair data returned');

  // ⚠️ Case-insensitive. EVM addresses are case-insensitive and DexScreener does
  // not promise the same casing back that you sent: a checksummed address
  // compared with === silently matches nothing.
  const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
  let mine = pairs.filter((p) => p.baseToken && same(p.baseToken.address, ca));
  if (!mine.length) throw new Error('token not found in any pool');

  // The same address can list on more than one chain. Keep the chain carrying
  // the real market rather than summing liquidity across chains, which would
  // invent depth that cannot be sold into from any one of them.
  const byChain = new Map();
  for (const p of mine) {
    const k = p.chainId || 'unknown';
    byChain.set(k, (byChain.get(k) || 0) + (p.liquidity?.usd || 0));
  }
  const chain = [...byChain.entries()].sort((a, b) => b[1] - a[1])[0][0];
  mine = mine.filter((p) => (p.chainId || 'unknown') === chain);
  mine.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

  const main = mine[0];
  return {
    name: main.baseToken.name,
    symbol: main.baseToken.symbol,
    chain,
    priceUsd: parseFloat(main.priceUsd),
    marketCap: main.marketCap,
    poolCount: mine.length,
    // Pool lists are unstable -- CATE went 3 -> 30 pools in 24h -- so never cache these.
    totalLiquidityUsd: mine.reduce((s, p) => s + (p.liquidity?.usd || 0), 0),
    mainPool: { dex: main.dexId, liquidityUsd: main.liquidity?.usd || 0, url: main.url, address: main.pairAddress },
    priceChange: main.priceChange || {},
    volume: main.volume || {},
    txns: main.txns || {},
    pairCreatedAt: main.pairCreatedAt,
    fetchedAt: Date.now(),
  };
}

module.exports = { fetchMarket };

// Price many mints at once, for the portfolio.
//
// A wallet cannot be valued one fetchMarket() at a time. Measured against a real address on
// 2026-08-29: 4,172 distinct mints, nearly all of them airdropped dust worth nothing. Pricing
// those individually would be 4,172 requests to answer a question about maybe a dozen real
// positions, so this batches (30 per call, the endpoint's documented ceiling) and the caller caps
// how many it is willing to ask about at all.
//
// Returns a Map keyed by the address AS GIVEN, so a caller can look up what it asked for. Mints
// with no market simply do not appear -- absence means "nothing trades this", which for a
// portfolio is a real answer (worthless dust) rather than a failure.
const BATCH = 30;

async function fetchPrices(mints, { chain = 'solana' } = {}) {
  const out = new Map();
  const list = [...new Set((mints || []).filter(Boolean))];
  for (let i = 0; i < list.length; i += BATCH) {
    const chunk = list.slice(i, i + BATCH);
    let pairs;
    try { pairs = await getJSON(`https://api.dexscreener.com/tokens/v1/${chain}/${chunk.join(',')}`); }
    catch { continue; }   // a failed chunk prices nothing; it never prices something wrongly
    if (!Array.isArray(pairs)) continue;

    // Same base-token filtering and case-insensitivity rules as fetchMarket, for the same reasons.
    for (const p of pairs) {
      const addr = p?.baseToken?.address;
      if (!addr) continue;
      const key = chunk.find((c) => String(c).toLowerCase() === String(addr).toLowerCase());
      if (!key) continue;
      const price = parseFloat(p.priceUsd);
      if (!(price > 0)) continue;
      const prev = out.get(key);
      const liq = p.liquidity?.usd || 0;
      // Keep the deepest pool's quote. Liquidity across every pool is a fetchMarket question;
      // here we only need a price that a real market actually supports.
      if (!prev || liq > prev.liquidityUsd) {
        out.set(key, {
          priceUsd: price, symbol: p.baseToken.symbol, name: p.baseToken.name,
          chain: p.chainId || chain, liquidityUsd: liq, marketCap: p.marketCap ?? null,
          priceChange: p.priceChange || {},
        });
      }
    }
  }
  return out;
}
module.exports.fetchPrices = fetchPrices;

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
