// Per-followed-trader BUY performance. Answers the question Connal asked 2026-09-09: "we need
// that data to see who is actually good" about his 58 FOMO-followed traders, now that their
// on-chain activity is actually being watched (`app/main/adapters/walletwatch.js`, D-129).
//
// !! REUSES TWO MECHANISMS ALREADY BUILT RATHER THAN INVENTING A THIRD RESOLUTION RULE:
// - `app/main/pumpcapture.js` (T-035) already starts a 2h/90s price recording off a real trigger
//   -- it was wired to `fomonotifications.js`, a trigger that has never once fired on this Mac
//   (D-129: the folder it would create does not exist). Pointed at `walletwatch.js`'s real,
//   currently-firing on-chain buy signal instead, the exact same recorder now has something real
//   to record. See `app/main/wallet-collect.js` for the wiring.
// - `shared/labels.js: checkBarrier` (D-05/triple-barrier) is the SAME resolution rule every
//   admission forecast is scored against. `timeoutHours` is overridden to match the capture's own
//   2-hour window (`CAPTURE_HOURS` below) -- the default 24h would leave every trade "pending"
//   forever, since no row past 2h will ever exist to resolve it.
//
// !! SELLS ARE COUNTED, NEVER SCORED. A followed wallet selling is already the near-unambiguous
// risk signal `80-WHISPERS/whale-tracking/README.md` describes on its own terms; we don't know
// their entry cost or size, so calling a sell a "win" or "loss" here would be invented, not
// measured. Only buys get resolved against a real outcome.
//
// !! THIS CANNOT ANSWER "WHY" A TRADER TRADES THE WAY THEY DO. Intent is not observable on-chain.
// What this measures is limited and stated plainly: whether their recent buys went on to hit a
// real +20%/-15% barrier inside 2 hours, and how often their own "buy" looked like a same-window
// flip (`selfTradeFlag`) rather than a held position. Anything beyond that is a guess this file
// refuses to make.
//
// !! n WILL BE NEAR-ZERO AT FIRST. The on-chain trigger only started firing 2026-09-08/09
// (D-129/D-131). Per D-05, nothing here should be trusted as a real read until well past
// single digits -- `trust` on each row says so honestly rather than ranking thin numbers as if
// they meant something.

const { checkBarrier } = require('./labels');

const CAPTURE_HOURS = 2; // must match app/main/pumpcapture.js: CAPTURE_DURATION_MS (2h)
const MATCH_WINDOW_MS = 5 * 60 * 1000; // how far a capture's first reading may drift from the signal it resolves

function pushMap(map, key, val) {
  const arr = map.get(key);
  if (arr) arr.push(val); else map.set(key, [val]);
}

// Groups raw `data/pump-captures.jsonl` rows into per-captureId series, then indexes those by
// coin (`ca`) so a signal can find whichever capture belongs to it.
function groupCaptures(captures) {
  const byId = new Map();
  for (const r of captures) {
    if (!r.captureId || !r.ca || !Number.isFinite(r.price) || r.price <= 0 || r.priceSuspect) continue;
    pushMap(byId, r.captureId, r);
  }
  const byCa = new Map();
  for (const rows of byId.values()) {
    rows.sort((a, b) => a.ts - b.ts);
    pushMap(byCa, rows[0].ca, rows);
  }
  for (const groups of byCa.values()) groups.sort((a, b) => a[0].ts - b[0].ts);
  return byCa;
}

// The nearest capture series for this coin whose first reading is within MATCH_WINDOW_MS of the
// signal -- usually the capture THIS signal itself started, occasionally one already running
// because another followed wallet bought the same coin moments earlier (`pumpcapture.startCapture`
// is a no-op while one is active for that coin, so a shared window is a known, stated limitation,
// not a bug).
function findCapture(byCa, mint, signalTs) {
  const groups = byCa.get(mint);
  if (!groups) return null;
  let best = null, bestDiff = Infinity;
  for (const rows of groups) {
    const diff = Math.abs(rows[0].ts - signalTs);
    if (diff <= MATCH_WINDOW_MS && diff < bestDiff) { best = rows; bestDiff = diff; }
  }
  return best;
}

function resolveBuy(signal, byCa) {
  const rows = findCapture(byCa, signal.mint, signal.ts);
  if (!rows) return { matched: false, outcome: null, win: null, ret: null, runningRet: null };
  const result = checkBarrier(rows[0].price, rows[0].ts, rows, { timeoutHours: CAPTURE_HOURS });
  if (result) return { matched: true, outcome: result.outcome, win: result.win, ret: result.ret, runningRet: null };
  const last = rows[rows.length - 1];
  return { matched: true, outcome: null, win: null, ret: null, runningRet: (last.price - rows[0].price) / rows[0].price };
}

// D-05's n>=50 bar, stated per-row rather than hidden behind a single cutoff -- a thin number is
// shown, labelled, never suppressed (D-119).
function trustLabel(n) {
  if (n < 10) return 'too little data yet';
  if (n < 50) return 'early read, not reliable yet';
  return 'enough data for a first real read';
}

// signals: rows from data/wallet-signals.jsonl (walletwatch.js's shape: handle, wallet, mint,
// direction, selfTradeFlag, ts). captures: rows from data/pump-captures.jsonl. Pure function --
// no network, no clock, no randomness, same discipline as shared/labels.js and shared/safety.js.
function computeTraderStats(signals, captures) {
  const byCa = groupCaptures(captures || []);
  const byHandle = new Map();
  for (const s of signals || []) {
    if (!s.handle || !s.mint || !Number.isFinite(s.ts)) continue;
    const h = byHandle.get(s.handle) || {
      handle: s.handle, wallet: s.wallet || null, buys: 0, sells: 0, selfTradeFlags: 0,
      resolved: 0, wins: 0, rets: [], runningRets: [], coins: new Set(), lastTs: 0,
    };
    if (s.selfTradeFlag) h.selfTradeFlags++;
    h.lastTs = Math.max(h.lastTs, s.ts);
    h.coins.add(s.mint);
    if (s.direction !== 'buy') { h.sells++; byHandle.set(s.handle, h); continue; }
    h.buys++;
    const r = resolveBuy(s, byCa);
    if (r.outcome != null) { h.resolved++; if (r.win) h.wins++; h.rets.push(r.ret); }
    else if (r.matched) h.runningRets.push(r.runningRet);
    byHandle.set(s.handle, h);
  }
  const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  return [...byHandle.values()].map((h) => ({
    handle: h.handle, wallet: h.wallet, buys: h.buys, sells: h.sells, coins: h.coins.size,
    lastTs: h.lastTs || null,
    selfTradeRate: h.buys + h.sells > 0 ? h.selfTradeFlags / (h.buys + h.sells) : null,
    resolved: h.resolved, wins: h.wins,
    winRate: h.resolved > 0 ? h.wins / h.resolved : null,
    avgRet: avg(h.rets),
    pending: h.runningRets.length,
    avgRunningRet: avg(h.runningRets),
    trust: trustLabel(h.resolved),
  })).sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1) || b.buys - a.buys);
}

module.exports = { computeTraderStats, CAPTURE_HOURS, MATCH_WINDOW_MS };
