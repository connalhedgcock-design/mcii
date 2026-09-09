const path = require('path');
const tp = require(path.join(process.cwd(), 'shared/tradepatterns.js'));
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`  PASS  ${n}${x ? '  ' + x : ''}`); } else { fail++; console.log(`  FAIL  ${n}${x ? '  ' + x : ''}`); } };

// Minute candles, oldest first, matching geckoterminal.js's ohlcv() shape.
const mk = (rows) => rows.map(([ts, o, h, l, c, v]) => ({ ts, o, h, l, c, v }));

// --- detectDevPumpShape ---------------------------------------------------

// Full shape: open $1 -> spike to $1.30 (+30%) -> dip to $1.15 (-11.5% off peak, still above open)
// -> second leg to $1.45 (+11.5% past the first peak).
const fullShape = mk([
  [0, 1.00, 1.05, 1.00, 1.05, 100],
  [1, 1.05, 1.30, 1.05, 1.28, 500],  // spike peak here (high 1.30)
  [2, 1.28, 1.28, 1.20, 1.22, 200],
  [3, 1.22, 1.22, 1.15, 1.16, 150],  // retrace low 1.15, still above open (1.00)
  [4, 1.16, 1.25, 1.16, 1.24, 300],
  [5, 1.24, 1.45, 1.24, 1.40, 600],  // second leg clears 1.30 by well over 2%
]);
const full = tp.detectDevPumpShape(fullShape);
check('full dev-pump shape matches', full.match === true, full.detail);
check('full shape is reported as a fact', full.kind === 'fact');

// Spike present, no dip yet at all (straight climb) -> partial, still forming.
const noDipYet = mk([
  [0, 1.00, 1.05, 1.00, 1.05, 100],
  [1, 1.05, 1.30, 1.05, 1.28, 500],
  [2, 1.28, 1.35, 1.27, 1.34, 200],
  [3, 1.34, 1.40, 1.33, 1.39, 200],
]);
const partial1 = tp.detectDevPumpShape(noDipYet);
check('spike with no real dip yet reads as partial', partial1.match === 'partial', partial1.detail);

// Spike, then retrace falls straight through the open -> false, explicitly a reversal not a dip.
const erasedOpen = mk([
  [0, 1.00, 1.05, 1.00, 1.05, 100],
  [1, 1.05, 1.30, 1.05, 1.28, 500],
  [2, 1.28, 1.28, 0.80, 0.85, 400],  // retrace low (0.80) below the open (1.00)
]);
const erased = tp.detectDevPumpShape(erasedOpen);
check('retrace through the open is rejected, not called a dip', erased.match === false, erased.detail);

// No opening spike at all.
const flatOpen = mk([
  [0, 1.00, 1.02, 0.99, 1.01, 100],
  [1, 1.01, 1.03, 1.00, 1.02, 100],
  [2, 1.02, 1.04, 1.01, 1.03, 100],
]);
check('a flat open never matches', tp.detectDevPumpShape(flatOpen).match === false);

// --- detectNoSellSide ------------------------------------------------------

const allUp = mk(Array.from({ length: 8 }, (_, i) => [i, 1 + i * 0.1, 1 + i * 0.1 + 0.05, 1 + i * 0.1, 1 + (i + 1) * 0.1, 100]));
check('an all-up-candle climb flags no-sell-side', tp.detectNoSellSide(allUp).match === true);

const mixed = mk(Array.from({ length: 8 }, (_, i) => {
  const up = i % 2 === 0;
  return [i, 1, up ? 1.1 : 0.95, up ? 1 : 0.9, up ? 1.08 : 0.92, 100];
}));
check('a real up/down mix does not flag no-sell-side', tp.detectNoSellSide(mixed).match === false);

// --- detectDeadCoin ---------------------------------------------------------

const dead = mk(Array.from({ length: 20 }, (_, i) => [i, 1, i < 5 ? 1.5 : 1.001, i < 5 ? 0.7 : 0.999, 1, i < 5 ? 5000 : 1]));
check('near-zero tail volume/range flags dead', tp.detectDeadCoin(dead).match === true);

const alive = mk(Array.from({ length: 20 }, (_, i) => [i, 1, 1.05, 0.95, 1 + (i % 3) * 0.01, 500]));
check('ongoing volume/range does not flag dead', tp.detectDeadCoin(alive).match === false);

// --- dipRead -----------------------------------------------------------------

const pullback = mk([
  [0, 1, 1.5, 1, 1.4, 100],
  [1, 1.4, 1.4, 1.2, 1.25, 100],
]); // peak 1.5 -> latest 1.25, an 16.7% pullback
const readSteady = tp.dipRead({ candles: pullback, devPumpMatch: { match: false }, liquidityDelta: { pct: 2 }, holderDelta: { pct: 0.5 } });
check('a pullback with steady liquidity/holders reads as ordinary', readSteady.match === 'pullback-steady', readSteady.detail);

const readFake = tp.dipRead({ candles: pullback, devPumpMatch: { match: true }, liquidityDelta: null, holderDelta: null });
check('a pullback after a matched dev-pump shape reads as the fake dip', readFake.match === 'fake-dip', readFake.detail);

const readMoving = tp.dipRead({ candles: pullback, devPumpMatch: { match: false }, liquidityDelta: { pct: -40 }, holderDelta: { pct: 0.5 } });
check('a pullback with liquidity actually moving reads as worth checking', readMoving.match === 'pullback-moving', readMoving.detail);

const tooShallow = mk([[0, 1, 1.02, 1, 1.01, 10], [1, 1.01, 1.02, 1.0, 1.0, 10]]);
check('a shallow move under the dip threshold is not called a dip either way', tp.dipRead({ candles: tooShallow }).match === null);

// --- analyzeShape composes all five, never fuses them into one score --------
const combined = tp.analyzeShape(fullShape);
check('analyzeShape returns exactly the five labelled indicators', combined.indicators.length === 5);
check('analyzeShape carries no combined score field', combined.score === undefined && combined.verdict === undefined);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
