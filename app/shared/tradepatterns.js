// Trade-pattern reads for the live trading HUD -- Connal's own manual method for a coin's first
// hours, made numeric. Working name (D-16: a person names things, the app doesn't -- Connal
// renames this once it's built and he's used it).
//
// ! WHY THIS IS DIFFERENT FROM "CHART PATTERN DETECTION" AND NOT REJECTED AS SUBJECTIVE.
// Classical multi-day candlestick shapes (head-and-shoulders etc.) spotted by eye are genuinely
// fuzzy -- easy to fool yourself with in hindsight, no falsifier. "Price spiked, then lost most of
// it within minutes of the peak, on falling volume" is a plain numeric test over real minute-level
// candles: it either measured that shape or it didn't. Every check below is that second kind --
// no invented shape library, just bounded, falsifiable arithmetic over `geckoterminal.js`'s own
// minute OHLCV, each one labelled with exactly what it measured.
//
// ! CREDIT WHERE IT'S DUE. Item 1 (the dev-pump / fake-dip shape) is Connal's own trading method,
// carried into the app as his heuristic -- not invented by MCII and not track-recorded here as a
// proven predictor of anything. The shape MATCH is a fact (measured, over a stated window); that a
// match means a rug is coming is his own read, stated as his, per the mandate's fact/est split.
//
// ! PARTIAL MATCHES ARE SHOWN, NOT HIDDEN (D-119). A shape still forming (spike + dip, no second
// leg yet) reports `match: 'partial'` with what it's still waiting on, never silently withheld
// until it either fully matches or fully fails.
//
// ! THRESHOLDS ARE NAMED, REVISABLE ESTIMATES, NOT PROVEN CUTOFFS. Every number in DEFAULTS is a
// first guess at where a real signal starts, not a backtested boundary -- state that plainly
// rather than implying precision that doesn't exist (mandate's anti-false-precision rule).

const DEFAULTS = {
  openWindowMinutes: 10,     // how many opening minutes count as "the open" for phase (a)
  peakConfirmPct: 2,         // a pullback of at least this much off the running high confirms phase (a)'s peak has passed
  spikeMinPct: 15,           // phase (a): minimum rise from the open to call it a spike
  retraceMinPct: 5,          // phase (b): minimum pullback off the peak to call it a real dip
  secondSpikeMinPct: 2,      // phase (c): minimum amount the second high must clear the first by
  smoothWindow: 10,          // candles looked at for the "suspiciously smooth" check
  smoothStdMaxFrac: 0.006,   // est: candle-to-candle return stdev below this, during a climb, reads as unusually uniform
  deadTailMinutes: 15,       // candles checked for the "dead / abandoned" read
  deadVolMaxPctOfTotal: 2,   // est: tail carrying less than this % of all recorded volume reads as dead
  deadRangeMaxPct: 1,        // est: tail moving less than this % high-to-low reads as dead
  noSellMinCandles: 6,
  noSellMaxDownVolShare: 0.05, // est: down-candle volume under 5% of total reads as "no real sell-side"
  dipMinPct: 3,               // minimum pullback from the recorded peak to call it a dip at all
  liqSteadyMaxAbsPct: 10,     // liquidity move within thisband counts as "steady" for the dip read
  holderSteadyMinPct: -2,     // top10 holder share move above this (i.e. not shrinking much) counts as "steady"
};

const pctChange = (a, b) => (a ? ((b - a) / a) * 100 : null);
const fmtPct = (n) => (n == null ? 'n/a' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`);

/**
 * Connal's own opening-shape method: a sharp early spike (dev buying their own supply to fake
 * demand), a shallow retrace that does NOT erase the open (the dev quietly selling that back off),
 * then a second, LARGER spike past the first peak (real outside buyers stepping in on what looks
 * like a dip -- which is when he says the dev actually cashes out).
 *
 * `candles`: minute OHLCV, oldest first, `{ts,o,h,l,c,v}` (geckoterminal.js's `ohlcv()` shape).
 */
function detectDevPumpShape(candles, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const id = 'dev-pump-shape', label = 'matches your dev-pump / fake-dip pattern';
  if (!candles || candles.length < 3) {
    return { id, label, kind: 'fact', match: false, detail: 'not enough minute candles yet to check (need at least 3)' };
  }

  const open0 = candles[0].o;
  // Track the running high from the open, stopping the moment price pulls back from it by a real
  // amount (`peakConfirmPct`) -- that first confirmed pullback is what marks phase (a)'s peak as
  // PASSED. Without this, taking the plain max-high over the whole open window picks up a LATER,
  // taller leg (phase c's own second spike) as if it were the first one, when the whole sequence
  // happens to fit inside one short window.
  const windowLimit = Math.min(o.openWindowMinutes, candles.length);
  let peakIdx = 0, peakHigh = candles[0].h;
  for (let i = 1; i < windowLimit; i++) {
    const c = candles[i];
    if (c.h > peakHigh) { peakHigh = c.h; peakIdx = i; continue; }
    const dropFromPeak = pctChange(peakHigh, c.l);
    if (dropFromPeak != null && dropFromPeak <= -o.peakConfirmPct) break;
  }
  const spikePct = pctChange(open0, peakHigh);
  if (spikePct == null || spikePct < o.spikeMinPct) {
    return { id, label, kind: 'fact', match: false,
      detail: `no sharp opening spike found -- the best rise in the first ${windowLimit} minute(s) was ${fmtPct(spikePct)}, needed ${o.spikeMinPct}%+` };
  }

  const after = candles.slice(peakIdx + 1);
  if (!after.length) {
    return { id, label, kind: 'fact', match: 'partial',
      detail: `opening spike found (${fmtPct(spikePct)}) -- no candles yet after the peak to check for the dip or a second leg` };
  }

  // Walk forward from the peak tracking the running low, stopping the moment price re-crosses the
  // peak high -- that crossing is where phase (c), not (b), begins.
  let retraceLow = after[0].l, retraceIdx = 0, crossIdx = -1;
  for (let i = 0; i < after.length; i++) {
    if (after[i].h > peakHigh) { crossIdx = i; break; }
    if (after[i].l < retraceLow) { retraceLow = after[i].l; retraceIdx = i; }
  }
  const retracePct = pctChange(peakHigh, retraceLow); // negative
  const erasedTheOpen = retraceLow <= open0;
  const realDip = retracePct != null && retracePct <= -o.retraceMinPct;

  if (erasedTheOpen) {
    return { id, label, kind: 'fact', match: false,
      detail: `opening spike found (${fmtPct(spikePct)}) but the pullback fell back through the open -- that's a straight reversal, not your fake-dip shape` };
  }
  if (!realDip) {
    return { id, label, kind: 'fact', match: 'partial',
      detail: `opening spike found (${fmtPct(spikePct)}) but no dip of ${o.retraceMinPct}%+ off the peak yet (deepest so far: ${fmtPct(retracePct)}) -- still forming` };
  }
  if (crossIdx === -1) {
    return { id, label, kind: 'fact', match: 'partial',
      detail: `spike (${fmtPct(spikePct)}) and dip (${fmtPct(retracePct)}) both found, holding above the open -- no second leg past the first peak yet` };
  }

  const secondLeg = after.slice(retraceIdx);
  const secondHigh = Math.max(...secondLeg.map((c) => c.h));
  const secondPct = pctChange(peakHigh, secondHigh);
  const secondBeatsFirst = secondPct != null && secondPct >= o.secondSpikeMinPct;

  if (!secondBeatsFirst) {
    return { id, label, kind: 'fact', match: 'partial',
      detail: `spike (${fmtPct(spikePct)}) and dip (${fmtPct(retracePct)}) found, price came back but hasn't cleared the first peak by ${o.secondSpikeMinPct}%+ yet (best so far: ${fmtPct(secondPct)})` };
  }
  return { id, label, kind: 'fact', match: true,
    detail: `full shape found: opened, spiked ${fmtPct(spikePct)}, dipped ${fmtPct(retracePct)} without erasing the open, then pushed ${fmtPct(secondPct)} past that first peak -- matches your dev-pump / fake-dip pattern. The shape match is measured; that it means a rug is coming is your own heuristic, not something MCII has track-recorded.` };
}

/** Real two-sided trading has sellers too. An up-only climb with near-zero down-candle volume is
 *  a coordination tell, not proof -- a genuinely great launch can also look like this early on. */
function detectNoSellSide(candles, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const id = 'no-sell-side', label = 'almost no real sell-side';
  if (!candles || candles.length < o.noSellMinCandles) {
    return { id, label, kind: 'est', match: false, detail: `not enough candles yet (need ${o.noSellMinCandles}+)` };
  }
  let upVol = 0, downVol = 0;
  for (const c of candles) { if (c.c >= c.o) upVol += c.v || 0; else downVol += c.v || 0; }
  const total = upVol + downVol;
  if (!total) return { id, label, kind: 'est', match: false, detail: 'no recorded volume yet' };
  const downShare = downVol / total;
  const match = downShare <= o.noSellMaxDownVolShare;
  return { id, label, kind: 'est', match,
    detail: `down-candle volume is ${(downShare * 100).toFixed(1)}% of all volume over ${candles.length} minute candles`
      + (match ? ' -- real two-sided trading almost always shows more sellers than this' : '') };
}

/** Bots executing uniform-sized buys move straighter than real, noisy human trading. Measures the
 *  spread of minute-to-minute returns during a net climb -- unusually low spread while climbing
 *  reads as coordinated, not proof of it. */
function detectSuspiciouslySmooth(candles, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const id = 'suspiciously-smooth', label = 'suspiciously smooth climb';
  if (!candles || candles.length < o.smoothWindow) {
    return { id, label, kind: 'est', match: false, detail: `not enough candles yet (need ${o.smoothWindow}+)` };
  }
  const win = candles.slice(-o.smoothWindow);
  const rets = [];
  for (let i = 1; i < win.length; i++) { const p = win[i - 1].c, c = win[i].c; if (p) rets.push((c - p) / p); }
  if (rets.length < 3) return { id, label, kind: 'est', match: false, detail: 'not enough closes to measure' };
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  const std = Math.sqrt(variance);
  const netPct = pctChange(win[0].o, win[win.length - 1].c);
  const climbing = netPct != null && netPct > 0;
  const match = climbing && std <= o.smoothStdMaxFrac;
  return { id, label, kind: 'est', match,
    detail: `candle-to-candle moves over the last ${win.length} minutes had a spread of ${(std * 100).toFixed(2)}% while price ${climbing ? `rose ${fmtPct(netPct)}` : `moved ${fmtPct(netPct)}`}`
      + (match ? ' -- unusually uniform for real, noisy human trading' : climbing ? ' -- noisy enough to look like ordinary trading' : ' -- not climbing, so this check doesn\'t apply') };
}

/** Not a rug on its own -- just "nothing is happening here anymore", worth knowing before assuming
 *  a quiet chart is a quiet accumulation phase. */
function detectDeadCoin(candles, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const id = 'dead-coin', label = 'nothing is happening here anymore';
  if (!candles || candles.length < o.deadTailMinutes) {
    return { id, label, kind: 'fact', match: false, detail: `not enough history yet (need ${o.deadTailMinutes}+ minutes)` };
  }
  const tail = candles.slice(-o.deadTailMinutes);
  const totalVol = candles.reduce((s, c) => s + (c.v || 0), 0);
  const tailVol = tail.reduce((s, c) => s + (c.v || 0), 0);
  const tailVolShare = totalVol ? (tailVol / totalVol) * 100 : 0;
  const hi = Math.max(...tail.map((c) => c.h)), lo = Math.min(...tail.map((c) => c.l));
  const rangePct = lo ? ((hi - lo) / lo) * 100 : 0;
  const match = tailVolShare <= o.deadVolMaxPctOfTotal && rangePct <= o.deadRangeMaxPct;
  return { id, label, kind: 'fact', match,
    detail: `the last ${tail.length} minutes carried ${tailVolShare.toFixed(1)}% of all recorded volume and moved ${rangePct.toFixed(2)}% high-to-low`
      + (match ? ' -- looks abandoned, not itself a rug signal' : '') };
}

/** Composes the shape check above with liquidity/holder-concentration trend into a plain read:
 *  is this pullback the fake dip in Connal's own pattern, or an ordinary pullback with everything
 *  else steady? Still descriptive only -- never a buy/sell call.
 *  `liquidityDelta`/`holderDelta`: `{pct, ...}` shape from `history.js: delta()`, or null/undefined
 *  when unavailable (a fresh, not-yet-tracked coin has neither -- read as unchecked, not steady). */
function dipRead({ candles, devPumpMatch, liquidityDelta, holderDelta } = {}, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const id = 'dip-read', label = 'dip vs distribution';
  if (!candles || candles.length < 2) {
    return { id, label, kind: 'est', match: null, detail: 'not enough price history to read a pullback yet' };
  }
  const closes = candles.map((c) => c.c);
  const peak = Math.max(...closes);
  const latest = closes[closes.length - 1];
  const pullbackPct = pctChange(peak, latest); // <= 0
  const inPullback = pullbackPct != null && pullbackPct <= -o.dipMinPct;

  if (!inPullback) {
    return { id, label, kind: 'est', match: null,
      detail: pullbackPct == null ? 'no clear peak yet'
        : `price is ${fmtPct(pullbackPct)} off its recorded peak -- not enough of a pullback to read either way` };
  }
  if (devPumpMatch && devPumpMatch.match === true) {
    return { id, label, kind: 'est', match: 'fake-dip',
      detail: `this pullback follows a matched dev-pump / fake-dip shape -- reads as the fake dip in that pattern, not a buyable one` };
  }
  const liqKnown = liquidityDelta && Number.isFinite(liquidityDelta.pct);
  const holderKnown = holderDelta && Number.isFinite(holderDelta.pct);
  const liqSteady = !liqKnown || Math.abs(liquidityDelta.pct) < o.liqSteadyMaxAbsPct;
  const holderSteady = !holderKnown || holderDelta.pct >= o.holderSteadyMinPct;

  if (liqSteady && holderSteady) {
    return { id, label, kind: 'est', match: 'pullback-steady',
      detail: `price pulled back ${fmtPct(pullbackPct)} from its recorded peak`
        + (liqKnown || holderKnown
          ? ` while ${[liqKnown ? 'liquidity' : null, holderKnown ? 'top-10 holder share' : null].filter(Boolean).join(' and ')} held steady -- reads as an ordinary pullback, not confirmed distribution`
          : ' -- liquidity and holder trend not available yet to check against, so this is a pullback read alone, not a distribution check') };
  }
  const moving = [!liqSteady ? 'liquidity' : null, !holderSteady ? 'holder concentration' : null].filter(Boolean).join(' and ');
  return { id, label, kind: 'est', match: 'pullback-moving',
    detail: `price pulled back ${fmtPct(pullbackPct)} while ${moving} moved too -- worth checking before reading this as just a dip` };
}

/** Runs every check above and returns the labelled indicator list the HUD renders directly --
 *  never a combined score, per this project's standing rule against fusing distinct reads into one
 *  number (D-117/D-122's discipline, applied here). */
function analyzeShape(candles, { liquidityDelta, holderDelta } = {}, opts = {}) {
  const devPump = detectDevPumpShape(candles, opts);
  const noSell = detectNoSellSide(candles, opts);
  const smooth = detectSuspiciouslySmooth(candles, opts);
  const dead = detectDeadCoin(candles, opts);
  const dip = dipRead({ candles, devPumpMatch: devPump, liquidityDelta, holderDelta }, opts);
  return { indicators: [devPump, noSell, smooth, dead, dip] };
}

module.exports = {
  DEFAULTS, detectDevPumpShape, detectNoSellSide, detectSuspiciouslySmooth, detectDeadCoin, dipRead, analyzeShape,
};
