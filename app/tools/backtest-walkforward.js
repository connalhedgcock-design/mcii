// Walk-forward backtest of ONE proxy rule against REAL historical price+volume, on the small set
// of coins this project has ever actually tracked. Run with: node tools/backtest-walkforward.js
//
// !! WHAT THIS DOES AND DOES NOT PROVE — read this before trusting a number out of it.
// - NOT a validation of the three-sensor design (`70-AREAS/trading-strategy/README.md`). Social
//   and wallet history cannot be reconstructed for past periods — there is no historical archive
//   for either — so this tests the MARKET sensor's core idea ALONE: rising volume while price
//   stays flat, the nearest honest proxy for D-38's "accumulating" pattern that price+volume-only
//   history can support (D-38 actually means holders+liquidity growing, which is not retroactively
//   available). No safety gates, no admission competition, no corroboration from anything else.
// - The coin sample is every coin this project has ever hand-added to a watchlist — small (n
//   trades in the single digits to low teens per run) and NOT a random or bias-free launch cohort.
//   A true point-in-time universe (every coin launched in some past window, survivors and deaths
//   alike) is not free to construct — see `70-AREAS/trading-strategy/LOG.md`'s 2026-09-02 entry.
// - ∴ n here will almost never clear D-05's n>=50 bar. Nothing this script prints should change a
//   real decision on its own. What it DOES prove, every run: the walk-forward MECHANISM has no
//   lookahead — the feature loop and the label loop never share an index — which is the reusable
//   asset. Re-run this once real social/wallet history has accumulated going forward; it cannot be
//   reconstructed backward.

const { fetchHistory } = require('../main/adapters/geckoterminal');
const fs = require('fs');
const path = require('path');

const COINS = [
  ['CATE', 'Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump'],
  ['NEEGY', '6oGuFDbEeaSzTcvrmmd2MqfNYwHKXFoN7regcR22pump'],
  ['DOGE-1', 'DpBzjtgGLF7QA9Ug3eUVGbnqa6j3jvYBn1XuQuktvfhm'],
  ['ANSEM', '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump'],
  ['ANTSEM', 'DuVgdHeEk7ejWPxWY5G3PQA99oEGGLmnbWuWWxpEpump'],
  ['LaPeace', 'CvjSaRcTmcrfutekYzrBEEdTWx1RmRTWDToqtXmCpump'],
  ['fone', 'CTPoyCwkjMvoJwU4xvZZqoD8tiYk6yDchySiN5gGpump'],
  ['invest', 'GNGhPhcLt5HJ6WjUHQSYoY3KhBFsksxu6FpvLpCFpump'],
];

const LOOKBACK_H = 12;       // hours of history required before the feature can be computed
const HORIZON_H = 24;        // triple-barrier time limit
const TARGET_PCT = 0.20;     // profit barrier
const STOP_PCT = -0.15;      // loss barrier
const VOL_MULT = 2.0;        // "volume pickup" vs its own recent baseline
const FLAT_BAND = 0.05;      // price considered "flat" within +/-5% over the lookback
const COOLDOWN_H = HORIZON_H; // do not re-fire on a still-open bet

const CACHE = path.join(__dirname, '.backtest-history-cache.json');

function median(xs) { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }

// ! `fetchHistory()` swallows a rate-limited OHLCV call into an empty array (`.catch(() => [])`
// inside `geckoterminal.js`) rather than throwing. A 0-length result must be retried, never cached
// as "done" — the first version of this tool cached a rate limit as real history and reported it
// as CATE having no data. Found by checking the output, not by reading the adapter.
async function fetchWithRetry(sym, ca, cache) {
  if (cache[sym] && cache[sym].hours.length > 0) return cache[sym];
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const h = await fetchHistory(ca);
      if (!h.hours.length) throw new Error('empty result (likely rate-limited, not a real zero)');
      cache[sym] = h;
      fs.writeFileSync(CACHE, JSON.stringify(cache));
      return h;
    } catch (e) {
      console.log(`  ${sym}: attempt ${attempt + 1} failed (${e.message}), waiting...`);
      await new Promise((r) => setTimeout(r, 9000));
    }
  }
  return null;
}

function walkForward(sym, candles) {
  const trades = [];
  let cooldownUntil = -1;
  // !! ANTI-LOOKAHEAD DISCIPLINE: at hour i, the FEATURE only ever reads candles[0..i]. The LABEL
  // (what happened next) only ever reads candles[i+1..]. These two loops never share an index.
  for (let i = LOOKBACK_H; i < candles.length; i++) {
    if (i < cooldownUntil) continue;
    const window = candles.slice(i - LOOKBACK_H, i + 1);
    const volBaseline = median(window.slice(0, -1).map((c) => c.v));
    const volNow = candles[i].v;
    const priceThen = candles[i - LOOKBACK_H].c;
    const priceNow = candles[i].c;
    const priceChange = priceThen > 0 ? (priceNow - priceThen) / priceThen : null;
    const fires = priceChange != null && Math.abs(priceChange) <= FLAT_BAND
                  && volBaseline > 0 && volNow >= volBaseline * VOL_MULT;
    if (!fires) continue;

    const entry = candles[i].c;
    const future = candles.slice(i + 1, i + 1 + HORIZON_H);
    let outcome = 'no-data', hoursToOutcome = null, ret = null;
    if (future.length) {
      outcome = 'timeout';
      for (let k = 0; k < future.length; k++) {
        const hi = (future[k].h - entry) / entry;
        const lo = (future[k].l - entry) / entry;
        if (lo <= STOP_PCT) { outcome = 'stop'; hoursToOutcome = k + 1; ret = STOP_PCT; break; }
        if (hi >= TARGET_PCT) { outcome = 'target'; hoursToOutcome = k + 1; ret = TARGET_PCT; break; }
      }
      if (outcome === 'timeout') { ret = (future.at(-1).c - entry) / entry; hoursToOutcome = future.length; }
    }
    trades.push({ sym, hourIndex: i, ts: candles[i].ts, priceChangeIntoSignal: +priceChange.toFixed(4),
                   volRatio: +(volNow / volBaseline).toFixed(2), outcome, hoursToOutcome,
                   ret: ret != null ? +ret.toFixed(4) : null });
    cooldownUntil = i + COOLDOWN_H;
  }
  return trades;
}

async function main() {
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch {}

  const all = [];
  for (const [sym, ca] of COINS) {
    const h = await fetchWithRetry(sym, ca, cache);
    if (!h) { console.log(`${sym}: GAVE UP after 6 attempts -- excluded from the sample, not faked.`); continue; }
    const trades = walkForward(sym, h.hours);
    all.push(...trades);
    console.log(`${sym}: ${h.hours.length} hourly candles -> ${trades.length} signal(s) fired`);
    await new Promise((r) => setTimeout(r, 2200));
  }

  console.log('\n--- EVERY TRADE, IN FULL (n is this small on purpose -- nothing hidden) ---');
  for (const t of all) console.log(JSON.stringify(t));

  const withOutcome = all.filter((t) => t.outcome !== 'no-data');
  const wins = withOutcome.filter((t) => t.outcome === 'target').length;
  const losses = withOutcome.filter((t) => t.outcome === 'stop').length;
  const timeouts = withOutcome.filter((t) => t.outcome === 'timeout').length;
  const avgRet = withOutcome.length ? withOutcome.reduce((s, t) => s + t.ret, 0) / withOutcome.length : null;

  console.log('\n--- SUMMARY ---');
  console.log(`n = ${withOutcome.length}  (target=${wins}  stop=${losses}  timeout=${timeouts})`);
  console.log(`hit rate among decisive trades (target vs stop only) = ${wins + losses ? (wins / (wins + losses) * 100).toFixed(0) + '%' : 'n/a'}`);
  console.log(`average return per signal, all outcomes = ${avgRet != null ? (avgRet * 100).toFixed(1) + '%' : 'n/a'}`);
  console.log(`\n!! n=${withOutcome.length}. D-05 requires n>=50 resolved forecasts before ANY performance claim`);
  console.log('is trusted. This is one trial, on hand-picked coins, with one un-tuned proxy rule. It shows');
  console.log('the MECHANISM has no lookahead, not that the rule has an edge.');
}

main();
