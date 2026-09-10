const path = require('path');
const ts = require(path.join(process.cwd(), 'shared/traderstats.js'));
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log(`  PASS  ${n}${x?'  '+x:''}`); } else { fail++; console.log(`  FAIL  ${n}${x?'  '+x:''}`); } };

check('no signals: empty result', ts.computeTraderStats([], []).length === 0);

// A buy with a capture that hits the +20% target.
const targetSignal = { handle: 'winner', wallet: 'w1', mint: 'MINT_TARGET', direction: 'buy', selfTradeFlag: false, ts: 1000 };
const targetCapture = [
  { captureId: 'c-target', ca: 'MINT_TARGET', ts: 1000, price: 1 },
  { captureId: 'c-target', ca: 'MINT_TARGET', ts: 2000, price: 1.25 },
];
{
  const [row] = ts.computeTraderStats([targetSignal], targetCapture);
  check('target hit: resolved', row.resolved === 1, `(resolved=${row.resolved})`);
  check('target hit: counted as a win', row.wins === 1 && row.winRate === 1, `(winRate=${row.winRate})`);
  check('target hit: return recorded', Math.abs(row.avgRet - 0.25) < 1e-9, `(avgRet=${row.avgRet})`);
}

// A buy with a capture that hits the -15% stop.
const stopSignal = { handle: 'loser', wallet: 'w2', mint: 'MINT_STOP', direction: 'buy', selfTradeFlag: false, ts: 1000 };
const stopCapture = [
  { captureId: 'c-stop', ca: 'MINT_STOP', ts: 1000, price: 1 },
  { captureId: 'c-stop', ca: 'MINT_STOP', ts: 2000, price: 0.8 },
];
{
  const [row] = ts.computeTraderStats([stopSignal], stopCapture);
  check('stop hit: resolved as a loss', row.resolved === 1 && row.wins === 0 && row.winRate === 0, `(winRate=${row.winRate})`);
}

// A buy whose capture is still inside its 2-hour window -- must NOT resolve as a win, loss, or zero.
const pendingSignal = { handle: 'pending', wallet: 'w3', mint: 'MINT_PENDING', direction: 'buy', selfTradeFlag: false, ts: 1000 };
const pendingCapture = [
  { captureId: 'c-pending', ca: 'MINT_PENDING', ts: 1000, price: 1 },
  { captureId: 'c-pending', ca: 'MINT_PENDING', ts: 2000, price: 1.05 },
];
{
  const [row] = ts.computeTraderStats([pendingSignal], pendingCapture);
  check('still pending: not resolved', row.resolved === 0, `(resolved=${row.resolved})`);
  check('still pending: winRate stays null, never 0', row.winRate === null, `(winRate=${row.winRate})`);
  check('still pending: counted as pending, running return shown', row.pending === 1 && Math.abs(row.avgRunningRet - 0.05) < 1e-9);
}

// A capture that runs past the 2-hour horizon without hitting either barrier -- must resolve via
// timeout, not stay pending forever (D-29: labels.js's own 24h default would never fire here).
const timeoutSignal = { handle: 'timeout', wallet: 'w4', mint: 'MINT_TIMEOUT', direction: 'buy', selfTradeFlag: false, ts: 1000 };
const twoHoursMs = 2 * 3600 * 1000;
const timeoutCapture = [
  { captureId: 'c-timeout', ca: 'MINT_TIMEOUT', ts: 1000, price: 1 },
  { captureId: 'c-timeout', ca: 'MINT_TIMEOUT', ts: 1000 + twoHoursMs + 500, price: 1.05 },
];
{
  const [row] = ts.computeTraderStats([timeoutSignal], timeoutCapture);
  check('past 2h with no barrier hit: resolves via timeout', row.resolved === 1, `(resolved=${row.resolved})`);
  check('timeout with a small gain still counts as a win', row.wins === 1, `(wins=${row.wins})`);
}

// No capture at all for this coin -- must not fabricate a resolution.
const uncapturedSignal = { handle: 'nodata', wallet: 'w5', mint: 'MINT_NONE', direction: 'buy', selfTradeFlag: false, ts: 1000 };
{
  const [row] = ts.computeTraderStats([uncapturedSignal], []);
  check('no capture at all: not resolved, not pending', row.resolved === 0 && row.pending === 0);
  check('no capture at all: trust says so', row.trust === 'too little data yet');
}

// Self-trade rate and sells: sells are counted but never scored as a win or a loss.
const mixed = [
  { handle: 'mixed', wallet: 'w6', mint: 'MINT_A', direction: 'buy', selfTradeFlag: true, ts: 1000 },
  { handle: 'mixed', wallet: 'w6', mint: 'MINT_B', direction: 'buy', selfTradeFlag: false, ts: 2000 },
  { handle: 'mixed', wallet: 'w6', mint: 'MINT_A', direction: 'sell', selfTradeFlag: true, ts: 3000 },
];
{
  const [row] = ts.computeTraderStats(mixed, []);
  check('sells counted, not scored', row.sells === 1 && row.buys === 2);
  check('self-trade rate is flags / (buys+sells)', Math.abs(row.selfTradeRate - (2 / 3)) < 1e-9, `(rate=${row.selfTradeRate})`);
  check('coins deduped correctly', row.coins === 2);
}

// Trust label boundaries -- D-05's n>=50 bar, applied per-trader, never hidden.
const manyResolved = (n, handle) => Array.from({ length: n }, (_, i) => ({
  handle, wallet: 'wN', mint: `MINT_N${handle}${i}`, direction: 'buy', selfTradeFlag: false, ts: 1000 + i,
}));
const capturesFor = (sig) => [
  { captureId: `c-${sig.mint}`, ca: sig.mint, ts: sig.ts, price: 1 },
  { captureId: `c-${sig.mint}`, ca: sig.mint, ts: sig.ts + 1000, price: 1.25 },
];
{
  const sigs9 = manyResolved(9, 'nine');
  const caps9 = sigs9.flatMap(capturesFor);
  const [row9] = ts.computeTraderStats(sigs9, caps9);
  check('9 resolved: too little data yet', row9.trust === 'too little data yet', `(resolved=${row9.resolved})`);

  const sigs10 = manyResolved(10, 'ten');
  const caps10 = sigs10.flatMap(capturesFor);
  const [row10] = ts.computeTraderStats(sigs10, caps10);
  check('10 resolved: early read', row10.trust === 'early read, not reliable yet', `(resolved=${row10.resolved})`);

  const sigs50 = manyResolved(50, 'fifty');
  const caps50 = sigs50.flatMap(capturesFor);
  const [row50] = ts.computeTraderStats(sigs50, caps50);
  check('50 resolved: enough for a first real read', row50.trust === 'enough data for a first real read', `(resolved=${row50.resolved})`);
}

// A capture whose first reading drifts outside the match window must not be attributed to a
// signal that isn't really its trigger.
const farSignal = { handle: 'toofar', wallet: 'w7', mint: 'MINT_FAR', direction: 'buy', selfTradeFlag: false, ts: 1000 };
const farCapture = [
  { captureId: 'c-far', ca: 'MINT_FAR', ts: 1000 + 10 * 60 * 1000, price: 1 }, // 10 min later -- outside MATCH_WINDOW_MS
  { captureId: 'c-far', ca: 'MINT_FAR', ts: 1000 + 11 * 60 * 1000, price: 1.5 },
];
{
  const [row] = ts.computeTraderStats([farSignal], farCapture);
  check('capture too far from the signal is not matched', row.resolved === 0 && row.pending === 0);
}

// Results sort best win rate first.
{
  const rows = ts.computeTraderStats([targetSignal, stopSignal], [...targetCapture, ...stopCapture]);
  check('sorted best win rate first', rows[0].handle === 'winner' && rows[1].handle === 'loser');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
