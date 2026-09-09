// Connal, 2026-09-09: test the specific FOUR-STAGE story against real outcomes, not chart-eyeballing --
// (1) an early price run-up with holder count barely moving (insiders/early wallets pushing it, not a
// crowd), (2) a pullback where holders still don't grow (distribution -- selling into thin real demand),
// (3) a second leg up where holders DO grow a lot (real people arriving), (4) a later collapse (a rug).
// Reuses `pricesanity.cleanPrices` (T-037 bad-quote filter) and follows `marketmanip.js: growthQuality`'s
// existing price-vs-holders logic, extended from a single before/after read to the multi-stage shape.
// ! GATES, NOT A SCORE -- same discipline as the rug gate and D-50 (never blend disagreeing signals into
// one number). Each stage is a yes/no check; the classification is the conjunction, same shape rescore.js
// already uses.

const fs = require('fs');
const path = require('path');
const { cleanPrices } = require('../shared/pricesanity');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const MIN_READINGS = 6; // below this a "stage" is one or two points -- noise, not a shape
const DIP_THRESHOLD = 0.15;      // >=15% pullback from a running high counts as a real dip
const ACCUM_PRICE_MOVE = 0.20;   // >=20% run-up counts as a real initial move worth reading
const ACCUM_HOLDER_LAG = 0.5;    // holders grew less than half as fast (proportionally) as price
const RECOVERY_HOLDER_LIFT = 1.3; // second-leg holder growth must beat the first leg's by >=30%
const RUG_PRICE_DROP = 0.20;     // final price <=20% of the all-time peak
const RUG_LIQ_DROP = 0.25;       // OR final liquidity <=25% of its peak

function readJsonl(name) {
  const file = path.join(DATA_DIR, name);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

function groupByCoin(rows) {
  const byCoin = new Map();
  for (const r of rows) {
    const key = r.ca || r.sym;
    if (!key) continue;
    if (!byCoin.has(key)) byCoin.set(key, []);
    byCoin.get(key).push(r);
  }
  return byCoin;
}

// Core classifier. `rows` = one coin's cleaned, time-sorted snapshots.
function classify(rows) {
  const n = rows.length;
  const price = (i) => rows[i].price;
  const holders = (i) => (rows[i].holders != null ? rows[i].holders : null);

  // Stage 1: earliest local peak -- the running high up to the first real pullback.
  let runMaxIdx = 0;
  let peak1Idx = null, troughIdx = null;
  for (let i = 1; i < n; i++) {
    if (price(i) > price(runMaxIdx)) runMaxIdx = i;
    const dropFromRun = (price(runMaxIdx) - price(i)) / price(runMaxIdx);
    if (peak1Idx == null && dropFromRun >= DIP_THRESHOLD) {
      peak1Idx = runMaxIdx;
      troughIdx = i;
    } else if (peak1Idx != null && i > troughIdx && price(i) < price(troughIdx)) {
      troughIdx = i; // dip is still deepening
    } else if (peak1Idx != null && price(i) > price(troughIdx) * (1 + DIP_THRESHOLD)) {
      break; // recovery leg has clearly started; stop extending the trough search
    }
  }

  const hasDip = peak1Idx != null && peak1Idx > 0;

  // Stage 1 signal: run-up to peak1 with holders lagging price (accumulation-shaped).
  let accumulationSignal = false;
  if (hasDip) {
    const p0 = price(0), p1 = price(peak1Idx);
    const priceMove = (p1 - p0) / p0;
    const h0 = holders(0), h1 = holders(peak1Idx);
    if (priceMove >= ACCUM_PRICE_MOVE && h0 != null && h1 != null && h0 > 0) {
      const holderMove = (h1 - h0) / h0;
      accumulationSignal = holderMove < priceMove * ACCUM_HOLDER_LAG;
    }
  }

  // Stage 2 signal: peak1 -> trough, holders flat/declining (distribution into no new buyers).
  let distributionSignal = false;
  if (hasDip) {
    const h1 = holders(peak1Idx), hT = holders(troughIdx);
    if (h1 != null && hT != null && h1 > 0) {
      distributionSignal = (hT - h1) / h1 <= 0.02; // essentially flat or down
    }
  }

  // Stage 3: second leg -- does price later exceed peak1 again, with a stronger holder pickup?
  let peak2Idx = null;
  let recoverySignal = false;
  if (hasDip) {
    let best = troughIdx;
    for (let i = troughIdx + 1; i < n; i++) if (price(i) > price(best)) best = i;
    if (price(best) > price(peak1Idx)) {
      peak2Idx = best;
      const hT = holders(troughIdx), h2 = holders(peak2Idx), h1 = holders(peak1Idx), h0 = holders(0);
      if (hT != null && h2 != null && hT > 0 && h1 != null && h0 != null) {
        const leg1HolderMove = h0 > 0 ? (h1 - h0) / h0 : null;
        const leg2HolderMove = (h2 - hT) / hT;
        if (leg1HolderMove != null) {
          recoverySignal = leg2HolderMove > 0 && leg2HolderMove > Math.max(leg1HolderMove, 0) * RECOVERY_HOLDER_LIFT;
        }
      }
    }
  }

  // Outcome: collapse from the ALL-TIME peak in this series to the final reading.
  let peakIdx = 0;
  for (let i = 1; i < n; i++) if (price(i) > price(peakIdx)) peakIdx = i;
  const finalIdx = n - 1;
  const peakPrice = price(peakIdx), finalPrice = price(finalIdx);
  const peakLiq = rows[peakIdx].liq, finalLiq = rows[finalIdx].liq;
  const verdictFail = rows.some((r) => r.verdict === 'FAIL');
  const priceCollapsed = peakPrice > 0 && finalPrice / peakPrice <= RUG_PRICE_DROP;
  const liqCollapsed = peakLiq && finalLiq != null && finalLiq / peakLiq <= RUG_LIQ_DROP;
  const rugged = verdictFail || priceCollapsed || liqCollapsed;

  return {
    n, hasDip, accumulationSignal, distributionSignal, recoverySignal,
    fullPattern: accumulationSignal && distributionSignal && recoverySignal,
    rugged, verdictFail, priceCollapsed, liqCollapsed,
    peakMultiple: rows[0].price > 0 ? peakPrice / rows[0].price : null,
  };
}

// Second classifier for the broad candidate universe, where holder counts are almost never
// collected (measured: 38 of 6,268 candidates.jsonl rows, 0.6%) so the holders-based test above
// cannot run on most coins. Substitutes VOLUME and LIQUIDITY growth for "real people arriving" --
// the same substitution `marketmanip.js`'s own LPI detector already leans on (a real move takes
// real trading volume through a pool that itself grows; a marked-up price on thin, unmoved
// liquidity is the manufactured shape). This is a DIFFERENT, coarser proxy, not a re-run of the
// holders test with new thresholds -- flagged explicitly so the two are never confused as one trial.
function classifyByVolume(rows) {
  const n = rows.length;
  const price = (i) => rows[i].price;
  const vol = (i) => (rows[i].vol24 ?? rows[i].v24 ?? null);
  const liq = (i) => (rows[i].liq != null ? rows[i].liq : null);

  let runMaxIdx = 0;
  let peak1Idx = null, troughIdx = null;
  for (let i = 1; i < n; i++) {
    if (price(i) > price(runMaxIdx)) runMaxIdx = i;
    const dropFromRun = (price(runMaxIdx) - price(i)) / price(runMaxIdx);
    if (peak1Idx == null && dropFromRun >= DIP_THRESHOLD) {
      peak1Idx = runMaxIdx;
      troughIdx = i;
    } else if (peak1Idx != null && i > troughIdx && price(i) < price(troughIdx)) {
      troughIdx = i;
    } else if (peak1Idx != null && price(i) > price(troughIdx) * (1 + DIP_THRESHOLD)) {
      break;
    }
  }
  const hasDip = peak1Idx != null && peak1Idx > 0;

  let accumulationSignal = false;
  if (hasDip) {
    const p0 = price(0), p1 = price(peak1Idx);
    const priceMove = (p1 - p0) / p0;
    const v0 = vol(0), v1 = vol(peak1Idx);
    if (priceMove >= ACCUM_PRICE_MOVE && v0 != null && v1 != null && v0 > 0) {
      const volMove = (v1 - v0) / v0;
      accumulationSignal = volMove < priceMove * ACCUM_HOLDER_LAG;
    }
  }

  let distributionSignal = false;
  if (hasDip) {
    const v1 = vol(peak1Idx), vT = vol(troughIdx);
    if (v1 != null && vT != null && v1 > 0) distributionSignal = (vT - v1) / v1 <= 0.02;
  }

  let peak2Idx = null;
  let recoverySignal = false;
  if (hasDip) {
    let best = troughIdx;
    for (let i = troughIdx + 1; i < n; i++) if (price(i) > price(best)) best = i;
    if (price(best) > price(peak1Idx)) {
      peak2Idx = best;
      const vT = vol(troughIdx), v2 = vol(peak2Idx), lT = liq(troughIdx), l2 = liq(peak2Idx);
      if (vT != null && v2 != null && vT > 0 && lT != null && l2 != null && lT > 0) {
        const volMove = (v2 - vT) / vT;
        const liqMove = (l2 - lT) / lT;
        // real second leg: both trading volume AND pool liquidity grew, not just the marked price
        recoverySignal = volMove > 0.5 && liqMove > 0.1;
      }
    }
  }

  let peakIdx = 0;
  for (let i = 1; i < n; i++) if (price(i) > price(peakIdx)) peakIdx = i;
  const finalIdx = n - 1;
  const peakPrice = price(peakIdx), finalPrice = price(finalIdx);
  const peakLiq = rows[peakIdx].liq, finalLiq = rows[finalIdx].liq;
  const verdictFail = rows.some((r) => r.verdict === 'FAIL');
  const priceCollapsed = peakPrice > 0 && finalPrice / peakPrice <= RUG_PRICE_DROP;
  const liqCollapsed = peakLiq && finalLiq != null && finalLiq / peakLiq <= RUG_LIQ_DROP;
  const rugged = verdictFail || priceCollapsed || liqCollapsed;

  return {
    n, hasDip, accumulationSignal, distributionSignal, recoverySignal,
    fullPattern: accumulationSignal && distributionSignal && recoverySignal,
    rugged, verdictFail, priceCollapsed, liqCollapsed,
    peakMultiple: rows[0].price > 0 ? peakPrice / rows[0].price : null,
  };
}

function runVolume(fileName, label) {
  const rows = readJsonl(fileName);
  const byCoin = groupByCoin(rows);
  const results = [];
  for (const [key, coinRows] of byCoin) {
    const cleaned = cleanPrices(coinRows).filter((r) => Number.isFinite(r.price) && r.price > 0);
    if (cleaned.length < MIN_READINGS) continue;
    const sym = coinRows[0].sym || key;
    results.push({ sym, key, ...classifyByVolume(cleaned) });
  }

  console.log(`\n=== ${label} (${fileName}) — VOLUME/LIQUIDITY proxy — ${results.length} coins ===`);
  const full = results.filter((r) => r.fullPattern);
  const noDip = results.filter((r) => !r.hasDip);
  const rugRate = (arr) => arr.length ? (arr.filter((r) => r.rugged).length / arr.length) : null;
  const pct = (x) => x == null ? 'n/a' : (x * 100).toFixed(1) + '%';
  console.log(`ALL coins: n=${results.length}, rug rate = ${pct(rugRate(results))}`);
  console.log(`FULL 4-stage match (volume/liquidity proxy): n=${full.length}, rug rate = ${pct(rugRate(full))}`);
  console.log(`NO dip: n=${noDip.length}, rug rate = ${pct(rugRate(noDip))}`);
  console.log(`-- full-pattern coins, named --`);
  for (const r of full) {
    console.log(`  ${r.sym}: rugged=${r.rugged} peakMultiple=${r.peakMultiple ? r.peakMultiple.toFixed(2) + 'x' : 'n/a'}`);
  }
  return results;
}

function run(fileName, label) {
  const rows = readJsonl(fileName);
  const byCoin = groupByCoin(rows);
  const results = [];
  for (const [key, coinRows] of byCoin) {
    const cleaned = cleanPrices(coinRows).filter((r) => Number.isFinite(r.price) && r.price > 0);
    if (cleaned.length < MIN_READINGS) continue;
    const sym = coinRows[0].sym || key;
    const c = classify(cleaned);
    results.push({ sym, key, ...c });
  }

  console.log(`\n=== ${label} (${fileName}) — ${results.length} coins with >=${MIN_READINGS} clean readings ===`);

  const withDip = results.filter((r) => r.hasDip);
  const full = results.filter((r) => r.fullPattern);
  const noDip = results.filter((r) => !r.hasDip);

  const rugRate = (arr) => arr.length ? (arr.filter((r) => r.rugged).length / arr.length) : null;
  const pct = (x) => x == null ? 'n/a' : (x * 100).toFixed(1) + '%';

  console.log(`ALL coins tested: n=${results.length}, rug/collapse rate = ${pct(rugRate(results))}`);
  console.log(`Had ANY dip after an early run-up: n=${withDip.length}, rug rate = ${pct(rugRate(withDip))}`);
  console.log(`FULL 4-stage match (accumulation + distribution-dip + broad-based recovery leg): n=${full.length}, rug rate = ${pct(rugRate(full))}`);
  console.log(`NO dip at all (straight climb or straight decline): n=${noDip.length}, rug rate = ${pct(rugRate(noDip))}`);

  const accumOnly = results.filter((r) => r.accumulationSignal);
  const distOnly = results.filter((r) => r.distributionSignal);
  const recovOnly = results.filter((r) => r.recoverySignal);
  console.log(`-- individual stage signals, marginal --`);
  console.log(`accumulation signal present: n=${accumOnly.length}, rug rate = ${pct(rugRate(accumOnly))}`);
  console.log(`distribution (dip w/o holder growth) present: n=${distOnly.length}, rug rate = ${pct(rugRate(distOnly))}`);
  console.log(`recovery leg (broad-based 2nd leg) present: n=${recovOnly.length}, rug rate = ${pct(rugRate(recovOnly))}`);

  console.log(`-- full-pattern coins, named --`);
  for (const r of full) {
    console.log(`  ${r.sym}: rugged=${r.rugged} (priceCollapsed=${r.priceCollapsed} liqCollapsed=${r.liqCollapsed} verdictFail=${r.verdictFail}) peakMultiple=${r.peakMultiple ? r.peakMultiple.toFixed(2) + 'x' : 'n/a'}`);
  }

  return results;
}

const mkt = run('market.jsonl', 'TRACKED WATCHLIST COINS (deep history, small n)');
const cand = run('candidates.jsonl', 'BROAD SCANNER CANDIDATES (shallow history, larger n)');
const mktVol = runVolume('market.jsonl', 'TRACKED WATCHLIST COINS');
const candVol = runVolume('candidates.jsonl', 'BROAD SCANNER CANDIDATES');

fs.writeFileSync(
  path.join(__dirname, '..', '..', 'data', 'lifecycle-pattern-test.json'),
  JSON.stringify({ ts: Date.now(), market: mkt, candidates: cand, marketVolumeProxy: mktVol, candidatesVolumeProxy: candVol }, null, 2),
);
console.log('\nWritten: data/lifecycle-pattern-test.json');
