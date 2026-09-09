// Orchestration for the live trading HUD -- pulls together everything the floating window needs
// for one coin: minute-level shape indicators (`shared/tradepatterns.js`), top-5-holder wallet
// forensics, a creator/deployer rug-history cross-check, and the existing research feed
// (`narrative.js`). Nothing here invents a combined score -- each piece stays its own labelled
// read, same discipline as `readouts.js: verdictPanel`'s per-input votes.
//
// Every network call is individually fault-tolerant: one feed failing must never blank the whole
// HUD, same "missed, not wrong" rule the rest of this project already follows (D-29).

const { fetchMarket } = require('./adapters/dexscreener');
const { fetchRecentMinutes } = require('./adapters/geckoterminal');
const { fetchSafety } = require('./adapters/rugcheck');
const { fetchPumpFunInfo, fetchCoinsByCreator } = require('./adapters/pumpfun');
const walletflow = require('./adapters/walletflow');
const washtrade = require('../shared/washtrade');
const tradepatterns = require('../shared/tradepatterns');
const { lookupNarrative } = require('./narrative');
const history = require('./history');
const signalstore = require('./signalstore');

// Est, first guesses -- see tradepatterns.js's own DEFAULTS header for the same caveat.
const LOW_BALANCE_SOL = 0.05;        // a wallet sitting on barely more than rent/fees looks purpose-made
const SIMILAR_CV_MAX = 0.3;          // coefficient of variation under this reads as "similar" balances
const FUNDING_DATE_CLUSTER_MS = 10 * 60 * 1000; // wallets funded within this window of each other, flagged
const RUG_SIGNAL_KINDS = ['liq-drain', 'liquidity-pull', 'safety-flip', 'safety-flip-live'];
const CREATOR_COIN_CHECK_CAP = 10;   // bounded lookback, same discipline as washtrade.js's own caps
const CREATOR_LIQ_COLLAPSE_PCT = -80;
const SHAPE_WINDOW_MS = 6 * 3600e3;  // 6h -- matches the timescale this feature is actually for

/**
 * Connal's manual top-5-holder checklist, automated where the data exists.
 * `topHolders`: `[{address, owner, pct}]` from `rugcheck.fetchSafety()`, already sorted
 * largest-first. ! Uses `owner` (the actual wallet), never `address` (the token account) -- see
 * the comment on `rugcheck.js`'s own mapping for why that distinction is load-bearing here.
 */
async function topHolderForensics(topHolders) {
  const targets = (topHolders || []).slice(0, 5).filter((h) => h.owner);
  if (!targets.length) {
    return { checked: [], balanceRead: { match: null, detail: 'no top-holder wallet addresses available for this coin' },
      fundingRead: { checked: 0, funderFound: 0, sameFunderClusters: [], dateClusters: [], detail: 'nothing to check' } };
  }

  const results = await Promise.all(targets.map(async (h) => {
    let balance = null;
    try { balance = await walletflow.getBalance(h.owner); } catch { /* left null -- unchecked, not zero */ }
    let funder = null;
    try { funder = await washtrade.findFunder(h.owner); } catch { /* unchecked, not "no funder" */ }
    return { address: h.owner, pct: h.pct, balance, funder };
  }));

  const withBalance = results.filter((r) => r.balance != null);
  let balanceRead;
  if (withBalance.length < 2) {
    balanceRead = { match: null, detail: `only ${withBalance.length} of ${targets.length} top-holder balances could be read -- not enough to compare` };
  } else {
    const vals = withBalance.map((r) => r.balance);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    const cv = mean ? Math.sqrt(variance) / mean : 0;
    const allLow = vals.every((v) => v <= LOW_BALANCE_SOL);
    const similar = cv <= SIMILAR_CV_MAX;
    const flag = similar && allLow;
    balanceRead = {
      match: flag ? 'similar-and-low' : similar ? 'similar' : 'diverse',
      detail: `${withBalance.length} of ${targets.length} top-holder SOL balances: ${vals.map((v) => v.toFixed(3)).join(', ')} (spread ${(cv * 100).toFixed(0)}% of the mean)`
        + (flag ? ' -- all low and similar, a real tell for freshly-funded, purpose-made wallets' : ''),
    };
  }

  const withFunder = results.filter((r) => r.funder);
  const byFunder = new Map();
  for (const r of withFunder) {
    const k = r.funder.from;
    if (!byFunder.has(k)) byFunder.set(k, []);
    byFunder.get(k).push(r.address);
  }
  const sameFunderClusters = [...byFunder.entries()].filter(([, list]) => list.length >= 2)
    .map(([funder, owners]) => ({ funder, owners }));

  const withTs = withFunder.filter((r) => r.funder.ts).sort((a, b) => a.funder.ts - b.funder.ts);
  const dateClusters = [];
  let group = [];
  for (const r of withTs) {
    if (!group.length || r.funder.ts - group[group.length - 1].funder.ts <= FUNDING_DATE_CLUSTER_MS) group.push(r);
    else { if (group.length >= 2) dateClusters.push(group); group = [r]; }
  }
  if (group.length >= 2) dateClusters.push(group);

  const fundingRead = {
    checked: results.length, funderFound: withFunder.length,
    sameFunderClusters,
    dateClusters: dateClusters.map((g) => ({ owners: g.map((r) => r.address), withinMinutes: FUNDING_DATE_CLUSTER_MS / 60000 })),
    detail: sameFunderClusters.length
      ? `${new Set(sameFunderClusters.flatMap((c) => c.owners)).size} of the top ${targets.length} holders trace to a shared funding source`
      : dateClusters.length
      ? `${new Set(dateClusters.flatMap((g) => g.owners)).size} of the top ${targets.length} holders were funded within ${FUNDING_DATE_CLUSTER_MS / 60000} minutes of each other, from different sources`
      : `no shared funding source or clustered funding time found among the ${withFunder.length} of ${targets.length} holders checked`,
  };

  return {
    checked: results.map((r) => ({ address: r.address, pct: r.pct, balance: r.balance,
      funder: r.funder ? { from: r.funder.from, ts: r.funder.ts } : null })),
    balanceRead, fundingRead,
  };
}

/**
 * Was the wallet that deployed this coin behind other coins that show a recorded rug signature.
 * Solana/pump.fun only -- the `creator` field only exists there (verified live 2026-09-09).
 * "Unchecked" for a coin MCII never tracked, never "clean" (D-29's rule, applied here).
 */
async function creatorRugHistory(ca, chain) {
  if (chain !== 'solana') return { available: false, reason: 'creator lookup only works for pump.fun/Solana coins right now' };
  let pf;
  try { pf = await fetchPumpFunInfo(ca); } catch { pf = null; }
  const creator = pf?.creator || null;
  if (!creator) return { available: false, reason: 'no pump.fun creator address found for this coin (not launched there, or the lookup failed)' };

  let others;
  try { others = await fetchCoinsByCreator(creator, CREATOR_COIN_CHECK_CAP + 1); }
  catch { others = []; }
  const checkable = others.filter((c) => c.ca && c.ca !== ca).slice(0, CREATOR_COIN_CHECK_CAP);

  const coins = checkable.map((c) => {
    let signals = [];
    try { signals = signalstore.readForCa(c.ca, { kinds: RUG_SIGNAL_KINDS }); } catch { signals = []; }
    let liqDelta = null;
    try { liqDelta = history.delta(c.ca, 'liq', 30 * 864e5); } catch { liqDelta = null; }
    const liqCollapsed = liqDelta && Number.isFinite(liqDelta.pct) && liqDelta.pct <= CREATOR_LIQ_COLLAPSE_PCT;
    return {
      ca: c.ca, symbol: c.symbol,
      checked: signals.length > 0 || !!liqDelta,
      rugSignals: signals.map((s) => ({ kind: s.kind, ts: s.ts })),
      liqDelta: liqDelta ? { pct: Math.round(liqDelta.pct), spanHours: Math.round(liqDelta.spanHours) } : null,
      flagged: signals.length > 0 || !!liqCollapsed,
    };
  });
  const checkedCount = coins.filter((c) => c.checked).length;
  const flaggedCount = coins.filter((c) => c.flagged).length;

  return {
    available: true, creator, totalCoinsFound: others.length, checkedCount, flaggedCount, coins,
    detail: others.length === 0
      ? `this wallet's own coin list came back empty from pump.fun -- unchecked, not clean`
      : checkedCount === 0
      ? `found ${others.length} other coin(s) from this creator, but MCII has no recorded history or alerts for any of them -- unchecked, not clean`
      : `of ${checkable.length} other coin(s) from this creator checked, ${checkedCount} have MCII history and ${flaggedCount} show a recorded rug signature`,
  };
}

/** Everything the HUD renders for one coin, in one call. Individual feed failures degrade the
 *  relevant section only -- never the whole read. */
async function buildHudRead(ca) {
  const market = await fetchMarket(ca); // real errors (not found etc) propagate -- the caller shows them
  const { chain, symbol, name, priceUsd, marketCap, totalLiquidityUsd } = market;

  const [minutesRes, safety, narrative] = await Promise.all([
    fetchRecentMinutes(ca, chain).catch((e) => ({ pool: null, minutes: [], error: e.message })),
    fetchSafety(ca).catch(() => null),
    lookupNarrative(ca).catch((e) => ({ error: String(e.message || e) })),
  ]);

  let liqDelta = null, holderDelta = null, liqSeries = [];
  try { liqDelta = history.delta(ca, 'liq', SHAPE_WINDOW_MS); } catch { /* no local history yet */ }
  try { holderDelta = history.delta(ca, 'top10', SHAPE_WINDOW_MS); } catch { /* no local history yet */ }
  try { liqSeries = history.series(ca, 'liq', SHAPE_WINDOW_MS); } catch { liqSeries = []; }

  const shape = tradepatterns.analyzeShape(minutesRes.minutes, { liquidityDelta: liqDelta, holderDelta });

  const [forensics, creatorHistory] = await Promise.all([
    topHolderForensics(safety?.topHolders || []),
    creatorRugHistory(ca, chain),
  ]);

  return {
    ca, chain, symbol, name, priceUsd, marketCap, liquidityUsd: totalLiquidityUsd,
    priceSeries: minutesRes.minutes.map((c) => ({ ts: c.ts, v: c.c, vol: c.v })),
    liqSeries,
    minuteCandleCount: minutesRes.minutes.length,
    minuteFeedError: minutesRes.error || null,
    shape,
    topHolders: safety?.topHolders || [],
    forensics,
    creatorHistory,
    narrative,
    builtAt: Date.now(),
  };
}

module.exports = { buildHudRead, topHolderForensics, creatorRugHistory };
