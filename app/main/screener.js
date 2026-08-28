const { getJSON } = require('./adapters/http');
const { throttle } = require('./adapters/ratelimit');
const { fetchSafety } = require('./adapters/rugcheck');
const { evaluateSafety } = require('../shared/safety');

// Market-wide screening as a funnel: many coins through cheap checks, few through expensive ones.
//
// The economics force this. The exit simulation costs ~17 API calls per token, so it cannot run
// across a discovery feed -- but liquidity and age come free in bulk. Each stage must therefore
// eliminate aggressively enough that the next one stays affordable.
//
// One thing this deliberately is NOT: a sniping tool. We skip everything under two hours old.
// Being first is a race against colocated bots and is not winnable from a laptop. Our edge is
// elimination -- being right about what to avoid -- not speed.

const FILTERS = {
  minLiquidityUsd: 25000,   // below this you cannot get out, whatever the chart says
  minPoolAgeHours: 2,       // skip the snipe window entirely
  maxPoolAgeHours: 720,     // 30 days; older is not a "new coin"
  minVolume24hUsd: 50000,   // needs real two-sided trade, not one wallet cycling
  minTxns24h: 150,
  maxSingleWalletPct: 15,
  minHolders: 300,
};

async function discover() {
  const found = new Map();
  // Source 1: newly profiled tokens. Cheap, generous limits, no key.
  try {
    const profiles = await getJSON('https://api.dexscreener.com/token-profiles/latest/v1');
    for (const p of profiles || []) {
      if (p.chainId === 'solana' && p.tokenAddress) found.set(p.tokenAddress, { ca: p.tokenAddress, via: 'new listing' });
    }
  } catch {}
  // Source 2: what promotional money is being spent on. Not a quality signal -- the opposite,
  // usually -- but it is where retail attention is being bought, so it belongs in the universe.
  try {
    const boosts = await getJSON('https://api.dexscreener.com/token-boosts/top/v1');
    for (const b of boosts || []) {
      if (b.chainId === 'solana' && b.tokenAddress && !found.has(b.tokenAddress))
        found.set(b.tokenAddress, { ca: b.tokenAddress, via: 'promoted' });
    }
  } catch {}
  // Source 3: trending by real volume.
  try {
    await throttle('geckoterminal', 25);
    const d = await getJSON('https://api.geckoterminal.com/api/v2/networks/solana/trending_pools');
    for (const p of d.data || []) {
      const id = p.relationships?.base_token?.data?.id || '';
      const ca = id.replace('solana_', '');
      if (ca && !found.has(ca)) found.set(ca, { ca, via: 'trending' });
    }
  } catch {}
  return [...found.values()];
}

// Stage 1: one bulk call per token. Kills the overwhelming majority.
async function stage1(cand) {
  let pairs;
  try {
    pairs = await getJSON(`https://api.dexscreener.com/token-pairs/v1/solana/${cand.ca}`);
  } catch (e) { return { ...cand, rejected: 'no market data', error: e.message }; }
  if (!Array.isArray(pairs) || !pairs.length) return { ...cand, rejected: 'no trading pairs' };

  const mine = pairs.filter((p) => p.baseToken?.address === cand.ca);
  if (!mine.length) return { ...cand, rejected: 'no pairs where this is the traded token' };
  mine.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
  const m = mine[0];

  const liq = mine.reduce((s, p) => s + (p.liquidity?.usd || 0), 0);
  const ageH = m.pairCreatedAt ? (Date.now() - m.pairCreatedAt) / 36e5 : null;
  const vol = m.volume?.h24 || 0;
  const tx = (m.txns?.h24?.buys || 0) + (m.txns?.h24?.sells || 0);

  // Buy and sell counts kept separately: the accumulation signal is being rebuilt on flow rather
  // than on holder counts, because pool state is read directly while holder counts come from an
  // index that has to scan every wallet -- and that index demonstrably rebuilds from zero.
  const info = { ...cand, symbol: m.baseToken.symbol, name: m.baseToken.name,
                 priceUsd: parseFloat(m.priceUsd), marketCap: m.marketCap || 0,
                 liquidityUsd: liq, ageHours: ageH, volume24h: vol, txns24h: tx,
                 buys24: m.txns?.h24?.buys ?? null, sells24: m.txns?.h24?.sells ?? null,
                 buys6: m.txns?.h6?.buys ?? null, sells6: m.txns?.h6?.sells ?? null,
                 change6h: m.priceChange?.h6 ?? null,
                 change24h: m.priceChange?.h24 ?? null, url: m.url };

  if (liq < FILTERS.minLiquidityUsd) return { ...info, rejected: `liquidity only $${Math.round(liq).toLocaleString()}` };
  if (ageH != null && ageH < FILTERS.minPoolAgeHours) return { ...info, rejected: `only ${ageH.toFixed(1)}h old` };
  if (ageH != null && ageH > FILTERS.maxPoolAgeHours) return { ...info, rejected: 'older than 30 days' };
  if (vol < FILTERS.minVolume24hUsd) return { ...info, rejected: `only $${Math.round(vol).toLocaleString()} traded in 24h` };
  if (tx < FILTERS.minTxns24h) return { ...info, rejected: `only ${tx} trades in 24h` };
  return { ...info, passedStage1: true };
}

// Stage 2: safety. One call per survivor.
async function stage2(cand) {
  let safety;
  try {
    await throttle('rugcheck', 30);
    safety = await fetchSafety(cand.ca);
  } catch (e) { return { ...cand, rejected: 'safety check unavailable', error: e.message }; }

  const gate = evaluateSafety(safety, { totalLiquidityUsd: cand.liquidityUsd, pairCreatedAt: Date.now() - cand.ageHours * 36e5 });
  const out = { ...cand, safety, gate };
  if (gate.verdict === 'FAIL') return { ...out, rejected: gate.findings.find((f) => f.level === 'CRITICAL')?.label || 'failed safety check' };
  if (safety.top1Pct != null && safety.top1Pct > FILTERS.maxSingleWalletPct)
    return { ...out, rejected: `one wallet holds ${safety.top1Pct.toFixed(1)}%` };
  if (safety.totalHolders != null && safety.totalHolders < FILTERS.minHolders)
    return { ...out, rejected: `only ${safety.totalHolders} holders` };
  return { ...out, passedStage2: true };
}

async function run({ onProgress = () => {}, limit = 60 } = {}) {
  const started = Date.now();
  onProgress('finding new coins…');
  const universe = (await discover()).slice(0, limit);

  const s1 = [];
  for (let i = 0; i < universe.length; i++) {
    onProgress(`checking market data ${i + 1}/${universe.length}`);
    s1.push(await stage1(universe[i]));
    await new Promise((r) => setTimeout(r, 220));
  }
  const alive1 = s1.filter((c) => c.passedStage1);

  const s2 = [];
  for (let i = 0; i < alive1.length; i++) {
    onProgress(`safety check ${i + 1}/${alive1.length}`);
    s2.push(await stage2(alive1[i]));
  }
  const survivors = s2.filter((c) => c.passedStage2)
    .sort((a, b) => (b.volume24h / Math.max(b.marketCap, 1)) - (a.volume24h / Math.max(a.marketCap, 1)));

  return {
    scannedAt: started, tookMs: Date.now() - started,
    universe: universe.length,
    rejectedStage1: s1.filter((c) => c.rejected),
    rejectedStage2: s2.filter((c) => c.rejected),
    survivors,
    // The rejects are the product as much as the survivors are. A screen that only shows what
    // passed hides how brutal the filter is, and that brutality is the honest finding.
    summary: `${universe.length} found → ${alive1.length} tradeable → ${survivors.length} passed safety`,
  };
}
module.exports = { run, discover, stage1, stage2, FILTERS };
